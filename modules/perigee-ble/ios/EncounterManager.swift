import CoreBluetooth
import Foundation

// すれ違い検知の本体。1台の iPhone が「発信側」と「受信側」を同時にこなす。
//
// 発信側(CBPeripheralManager):
//   決まったサービス UUID を広告し、接続してきた相手に自分の一時ID(トークン)を読ませる。
//   アプリを開いている間は、広告の名前にもトークンを入れる(相手は接続せずに読める)。
// 受信側(CBCentralManager):
//   同じサービス UUID を探す。広告の名前にトークンがあればそれを使い、
//   なければ接続してトークンを読む(相手がバックグラウンドのときはこちらになる)。
//
// CoreBluetooth の呼び出しとコールバックは、すべて queue の上で行う(状態の取り合いを防ぐ)。
final class EncounterManager: NSObject {
  typealias Emit = (String, [String: Any?]) -> Void

  // 全員のアプリで同じ値にする。変えると古いビルドどうしで検知できなくなる
  static let serviceUUID = CBUUID(string: "59D4A33A-C799-42A3-8326-C4AF36563039")
  static let tokenCharacteristicUUID = CBUUID(string: "39615FE4-341E-4E9A-A857-27D217B11A9E")

  private static let connectTimeout: TimeInterval = 10
  private static let failureBackoff: TimeInterval = 15
  private static let maxConcurrentConnections = 3

  private let emit: Emit
  private let queue = DispatchQueue(label: "perigee.ble")
  private let isoFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private var central: CBCentralManager?
  private var peripheralManager: CBPeripheralManager?
  private var serviceAdded = false
  private var addingService = false

  private var running = false
  private var token: String?
  private var minRssi = -85
  private var useGatt = true
  private var cooldown: TimeInterval = 60

  // 接続してトークンを読んでいる途中の相手
  private var connecting: [UUID: CBPeripheral] = [:]
  private var connectingRssi: [UUID: Int] = [:]
  private var timeouts: [UUID: DispatchWorkItem] = [:]
  // 相手ごとの「次に検知してよい時刻」
  private var nextAllowedAt: [UUID: Date] = [:]

  init(emit: @escaping Emit) {
    self.emit = emit
    super.init()
  }

  // MARK: - JS から呼ばれる操作

  func start(token: String, minRssi: Int, useGatt: Bool, cooldown: TimeInterval) {
    queue.async {
      self.token = token.isEmpty ? nil : token
      self.minRssi = minRssi
      self.useGatt = useGatt
      self.cooldown = cooldown
      self.running = true
      self.log("start(useGatt=\(useGatt), minRssi=\(minRssi))")

      // マネージャーを作った時点で Bluetooth の許可ダイアログが出る
      if let central = self.central {
        if central.state == .poweredOn { self.startScan() }
      } else {
        self.central = CBCentralManager(
          delegate: self, queue: self.queue,
          options: [CBCentralManagerOptionShowPowerAlertKey: false])
      }
      if let peripheralManager = self.peripheralManager {
        if peripheralManager.state == .poweredOn { self.setupServiceAndAdvertise() }
      } else {
        self.peripheralManager = CBPeripheralManager(
          delegate: self, queue: self.queue,
          options: [CBPeripheralManagerOptionShowPowerAlertKey: false])
      }
      self.emitStatus()
    }
  }

  func updateToken(_ token: String) {
    queue.async {
      guard token != self.token else { return }
      self.token = token.isEmpty ? nil : token
      self.log("token updated")
      // 広告の名前を新しいトークンにする。接続して読む値は didReceiveRead で毎回最新を返す
      if self.running && self.serviceAdded { self.startAdvertising() }
    }
  }

  func stop() {
    queue.async {
      guard self.running else { return }
      self.running = false
      self.central?.stopScan()
      for id in Array(self.connecting.keys) { self.finishConnection(id, failure: nil) }
      self.peripheralManager?.stopAdvertising()
      self.peripheralManager?.removeAllServices()
      self.serviceAdded = false
      self.addingService = false
      self.log("stop")
      self.emitStatus()
    }
  }

  func status() -> [String: Any] {
    queue.sync { makeStatus() }
  }

  // MARK: - 受信側

  private func startScan() {
    guard running, let central, central.state == .poweredOn else { return }
    // AllowDuplicates はアプリを開いている間だけ効く(同じ相手の広告を何度も受け取れる)。
    // バックグラウンドでは iOS が無視し、同じ相手は1回しか届かない。
    central.scanForPeripherals(
      withServices: [Self.serviceUUID],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    emitStatus()
  }

  // スキャンをやり直して、iOS の「同じ相手は1回だけ」の記憶を消す(バックグラウンドで次も検知できるように)
  private func restartScan() {
    guard running, let central, central.state == .poweredOn else { return }
    central.stopScan()
    startScan()
  }

  private func handleDiscovery(_ peripheral: CBPeripheral, advertisementData: [String: Any], rssi: Int) {
    guard running else { return }
    // 127 は「電波の強さが取れなかった」という意味
    guard rssi != 127, rssi >= minRssi else { return }

    let id = peripheral.identifier
    let now = Date()
    if let next = nextAllowedAt[id], now < next { return }
    if connecting[id] != nil { return }

    // 相手がアプリを開いていれば、広告の名前にトークンが入っている
    if let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String,
      Self.isAdvertisableToken(name)
    {
      nextAllowedAt[id] = now.addingTimeInterval(cooldown)
      emitEncounter(token: name, rssi: rssi, via: "advertisement")
      restartScan()
      return
    }

    guard useGatt else { return }
    guard connecting.count < Self.maxConcurrentConnections else { return }
    guard let central else { return }

    connecting[id] = peripheral
    connectingRssi[id] = rssi
    peripheral.delegate = self
    central.connect(peripheral, options: nil)

    let timeout = DispatchWorkItem { [weak self] in
      self?.finishConnection(id, failure: "timeout")
    }
    timeouts[id] = timeout
    queue.asyncAfter(deadline: .now() + Self.connectTimeout, execute: timeout)
  }

  private func finishConnection(_ id: UUID, failure: String?) {
    timeouts.removeValue(forKey: id)?.cancel()
    connectingRssi.removeValue(forKey: id)
    guard let peripheral = connecting.removeValue(forKey: id) else { return }
    central?.cancelPeripheralConnection(peripheral)
    if let failure {
      nextAllowedAt[id] = Date().addingTimeInterval(Self.failureBackoff)
      log("gatt failed: \(failure) (\(id.uuidString.prefix(8)))")
    }
    pruneNextAllowed()
    restartScan()
  }

  private func handleTokenRead(_ peripheral: CBPeripheral, data: Data?) {
    let id = peripheral.identifier
    guard connecting[id] != nil else { return }
    guard let data, let token = String(data: data, encoding: .utf8)?
      .trimmingCharacters(in: .whitespacesAndNewlines), !token.isEmpty
    else {
      finishConnection(id, failure: "empty_token")
      return
    }
    let rssi = connectingRssi[id] ?? minRssi
    nextAllowedAt[id] = Date().addingTimeInterval(cooldown)
    emitEncounter(token: token, rssi: rssi, via: "gatt")
    finishConnection(id, failure: nil)
  }

  private func pruneNextAllowed() {
    guard nextAllowedAt.count > 500 else { return }
    let now = Date()
    nextAllowedAt = nextAllowedAt.filter { $0.value > now }
  }

  // MARK: - 発信側

  private func setupServiceAndAdvertise() {
    guard running, let peripheralManager, peripheralManager.state == .poweredOn else { return }
    if serviceAdded {
      startAdvertising()
      return
    }
    guard !addingService else { return }
    addingService = true
    // value を nil にすると、読まれるたびに didReceiveRead で最新のトークンを返せる
    let characteristic = CBMutableCharacteristic(
      type: Self.tokenCharacteristicUUID, properties: [.read], value: nil,
      permissions: [.readable])
    let service = CBMutableService(type: Self.serviceUUID, primary: true)
    service.characteristics = [characteristic]
    peripheralManager.add(service)
  }

  private func startAdvertising() {
    guard running, serviceAdded, let peripheralManager else { return }
    peripheralManager.stopAdvertising()
    var data: [String: Any] = [CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID]]
    // 名前に入れるのは本番のトークン(16文字)のときだけ。長いと切られて別の値になるため
    if let token, Self.isAdvertisableToken(token) {
      data[CBAdvertisementDataLocalNameKey] = token
    }
    peripheralManager.startAdvertising(data)
  }

  /// issue_ble_token が作るトークン(16桁の16進数)か
  private static func isAdvertisableToken(_ value: String) -> Bool {
    value.count == 16 && value.allSatisfy { $0.isHexDigit }
  }

  // MARK: - JS へのイベント

  private func emitEncounter(token: String, rssi: Int, via: String) {
    log("encounter via \(via) rssi=\(rssi)")
    emit("onEncounter", [
      "token": token,
      "rssi": rssi,
      "detectedAt": isoFormatter.string(from: Date()),
      "via": via,
    ])
  }

  private func emitStatus() {
    emit("onStatusChange", makeStatus())
  }

  private func makeStatus() -> [String: Any] {
    [
      "running": running,
      "authorization": Self.authorizationName(CBManager.authorization),
      "central": Self.stateName(central?.state),
      "peripheral": Self.stateName(peripheralManager?.state),
      "scanning": central?.isScanning ?? false,
      "advertising": peripheralManager?.isAdvertising ?? false,
      "connecting": connecting.count,
    ]
  }

  private func log(_ message: String) {
    NSLog("[PerigeeBle] %@", message)
    emit("onLog", ["message": message, "at": isoFormatter.string(from: Date())])
  }

  private static func stateName(_ state: CBManagerState?) -> String {
    // マネージャーをまだ作っていない(start 前)
    guard let state else { return "off" }
    switch state {
    case .poweredOn: return "poweredOn"
    case .poweredOff: return "poweredOff"
    case .unauthorized: return "unauthorized"
    case .unsupported: return "unsupported"
    case .resetting: return "resetting"
    case .unknown: return "unknown"
    @unknown default: return "unknown"
    }
  }

  private static func authorizationName(_ authorization: CBManagerAuthorization) -> String {
    switch authorization {
    case .allowedAlways: return "allowedAlways"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
  }
}

// MARK: - CBCentralManagerDelegate

extension EncounterManager: CBCentralManagerDelegate {
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    log("central: \(Self.stateName(central.state))")
    if central.state == .poweredOn {
      startScan()
    } else {
      // Bluetooth が切れると接続中の相手は自動で切断扱いになる
      for id in Array(connecting.keys) { finishConnection(id, failure: "bluetooth_off") }
    }
    emitStatus()
  }

  func centralManager(
    _ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any], rssi RSSI: NSNumber
  ) {
    handleDiscovery(peripheral, advertisementData: advertisementData, rssi: RSSI.intValue)
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    guard connecting[peripheral.identifier] != nil else {
      central.cancelPeripheralConnection(peripheral)
      return
    }
    peripheral.discoverServices([Self.serviceUUID])
  }

  func centralManager(
    _ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?
  ) {
    finishConnection(peripheral.identifier, failure: "connect_failed")
  }

  func centralManager(
    _ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?
  ) {
    // 読み終わる前に切れたときだけ失敗として扱う(読み終わったあとは connecting から消えている)
    finishConnection(peripheral.identifier, failure: "disconnected")
  }
}

// MARK: - CBPeripheralDelegate(接続した相手からトークンを読む)

extension EncounterManager: CBPeripheralDelegate {
  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard error == nil,
      let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID })
    else {
      finishConnection(peripheral.identifier, failure: "no_service")
      return
    }
    peripheral.discoverCharacteristics([Self.tokenCharacteristicUUID], for: service)
  }

  func peripheral(
    _ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?
  ) {
    guard error == nil,
      let characteristic = service.characteristics?.first(where: {
        $0.uuid == Self.tokenCharacteristicUUID
      })
    else {
      finishConnection(peripheral.identifier, failure: "no_characteristic")
      return
    }
    peripheral.readValue(for: characteristic)
  }

  func peripheral(
    _ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?
  ) {
    guard characteristic.uuid == Self.tokenCharacteristicUUID else { return }
    if error != nil {
      finishConnection(peripheral.identifier, failure: "read_failed")
      return
    }
    handleTokenRead(peripheral, data: characteristic.value)
  }
}

// MARK: - CBPeripheralManagerDelegate(相手にトークンを読ませる)

extension EncounterManager: CBPeripheralManagerDelegate {
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    log("peripheral: \(Self.stateName(peripheral.state))")
    if peripheral.state == .poweredOn {
      setupServiceAndAdvertise()
    } else {
      // Bluetooth が切れると登録したサービスは消える
      serviceAdded = false
      addingService = false
    }
    emitStatus()
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    addingService = false
    if let error {
      log("add service failed: \(error.localizedDescription)")
      emitStatus()
      return
    }
    serviceAdded = true
    if running {
      startAdvertising()
    } else {
      peripheral.removeAllServices()
      serviceAdded = false
    }
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error {
      log("advertising failed: \(error.localizedDescription)")
    } else {
      log("advertising")
    }
    emitStatus()
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    guard request.characteristic.uuid == Self.tokenCharacteristicUUID else {
      peripheral.respond(to: request, withResult: .attributeNotFound)
      return
    }
    guard running, let token, let data = token.data(using: .utf8) else {
      peripheral.respond(to: request, withResult: .unlikelyError)
      return
    }
    // 長い値は何回かに分けて読まれる(offset はその読み始めの位置)
    guard request.offset <= data.count else {
      peripheral.respond(to: request, withResult: .invalidOffset)
      return
    }
    request.value = data.subdata(in: request.offset..<data.count)
    peripheral.respond(to: request, withResult: .success)
  }
}
