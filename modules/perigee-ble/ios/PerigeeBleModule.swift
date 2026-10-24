import ExpoModulesCore

// JS から見える窓口。BLE の処理そのものは EncounterManager にある。
struct StartOptions: Record {
  /// 自分の一時ID(issue_ble_token が返す値)
  @Field var token: String = ""
  /// これより弱い電波(遠い相手)は無視する。サーバーのしきい値とそろえる
  @Field var minRssi: Int = -85
  /// false にすると、接続してIDを読む方式を使わない(広告の名前で読める相手だけ検知する)
  @Field var useGatt: Bool = true
  /// 同じ相手を検知したあと、次に検知するまで空ける秒数
  @Field var cooldownSec: Double = 60
}

public class PerigeeBleModule: Module {
  private var manager: EncounterManager?

  public func definition() -> ModuleDefinition {
    Name("PerigeeBle")

    Events("onEncounter", "onStatusChange", "onLog")

    OnCreate {
      self.manager = EncounterManager { [weak self] name, body in
        self?.sendEvent(name, body)
      }
    }

    OnDestroy {
      self.manager?.stop()
    }

    AsyncFunction("start") { (options: StartOptions) in
      self.manager?.start(
        token: options.token,
        minRssi: options.minRssi,
        useGatt: options.useGatt,
        cooldown: options.cooldownSec
      )
    }

    Function("updateToken") { (token: String) in
      self.manager?.updateToken(token)
    }

    AsyncFunction("stop") {
      self.manager?.stop()
    }

    Function("getStatus") { () -> [String: Any] in
      self.manager?.status() ?? [:]
    }
  }
}
