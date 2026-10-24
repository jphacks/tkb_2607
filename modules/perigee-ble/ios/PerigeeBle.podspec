Pod::Spec.new do |s|
  s.name           = 'PerigeeBle'
  s.version        = '1.0.0'
  s.summary        = 'Perigee のすれ違い検知(BLE)'
  s.description    = 'CoreBluetooth で一時IDを発信・受信する Expo ローカルモジュール'
  s.license        = 'MIT'
  s.author         = 'Perigee'
  s.homepage       = 'https://github.com/jphacks/tkb_2607'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/jphacks/tkb_2607.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
