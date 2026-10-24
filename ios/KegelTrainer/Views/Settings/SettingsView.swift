import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settingsManager: SettingsManager
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("预设方案")) {
                    ForEach(PresetType.allCases) { preset in
                        Button(action: {
                            settingsManager.applyPreset(preset)
                        }) {
                            HStack {
                                Text(preset.title)
                                Spacer()
                                if isPresetSelected(preset) {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                }
                
                Section(header: Text("自定义设置")) {
                    Stepper("每组次数: \(settingsManager.repsPerSet)", value: $settingsManager.repsPerSet, in: 5...50)
                    Stepper("总组数: \(settingsManager.totalSets)", value: $settingsManager.totalSets, in: 1...10)
                    Stepper("收缩时间: \(settingsManager.contractTime)s", value: Binding(
                        get: { settingsManager.contractTime },
                        set: { settingsManager.contractTime = $0 }
                    ), in: 1...30)
                    Stepper("放松时间: \(settingsManager.relaxTime)s", value: Binding(
                        get: { settingsManager.relaxTime },
                        set: { settingsManager.relaxTime = $0 }
                    ), in: 1...30)
                    Stepper("组间休息: \(settingsManager.restTime)s", value: Binding(
                        get: { settingsManager.restTime },
                        set: { settingsManager.restTime = $0 }
                    ), in: 5...60)
                }
                
                Section(header: Text("辅助功能")) {
                    Toggle("音效提示", isOn: $settingsManager.soundEnabled)
                    Toggle("振动反馈", isOn: $settingsManager.hapticsEnabled)
                    Toggle("每日提醒", isOn: Binding(
                        get: { settingsManager.settings.dailyReminderEnabled },
                        set: { settingsManager.settings.dailyReminderEnabled = $0 }
                    ))
                    if settingsManager.settings.dailyReminderEnabled {
                        DatePicker("提醒时间", selection: Binding(
                            get: { settingsManager.settings.reminderTime },
                            set: { settingsManager.settings.reminderTime = $0 }
                        ), displayedComponents: .hourAndMinute)
                    }
                }
            }
            .navigationTitle("设置")
        }
    }
    
    private func isPresetSelected(_ preset: PresetType) -> Bool {
        let current = settingsManager.settings
        let target = preset.settings
        return current.repsPerSet == target.repsPerSet &&
               current.totalSets == target.totalSets &&
               current.contractTime == target.contractTime &&
               current.relaxTime == target.relaxTime &&
               current.restTime == target.restTime
    }
}
