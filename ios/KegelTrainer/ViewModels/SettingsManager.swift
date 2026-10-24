import SwiftUI
import Combine

class SettingsManager: ObservableObject {
    static let shared = SettingsManager()
    
    @Published var settings: Settings {
        didSet {
            StorageManager.shared.saveSettings(settings)
        }
    }
    
    // Add computed properties for easy binding
    var repsPerSet: Int {
        get { settings.repsPerSet }
        set { settings.repsPerSet = newValue }
    }
    
    var totalSets: Int {
        get { settings.totalSets }
        set { settings.totalSets = newValue }
    }
    
    var contractTime: Int {
        get { settings.contractTime }
        set { settings.contractTime = newValue }
    }
    
    var relaxTime: Int {
        get { settings.relaxTime }
        set { settings.relaxTime = newValue }
    }
    
    var restTime: Int {
        get { settings.restTime }
        set { settings.restTime = newValue }
    }
    
    var soundEnabled: Bool {
        get { settings.soundEnabled }
        set { settings.soundEnabled = newValue }
    }
    
    var hapticsEnabled: Bool {
        get { settings.hapticsEnabled }
        set { settings.hapticsEnabled = newValue }
    }
    
    private init() {
        self.settings = StorageManager.shared.loadSettings()
    }
    
    func applyPreset(_ preset: PresetType) {
        let newSettings = preset.settings
        self.settings.repsPerSet = newSettings.repsPerSet
        self.settings.totalSets = newSettings.totalSets
        self.settings.contractTime = newSettings.contractTime
        self.settings.relaxTime = newSettings.relaxTime
        self.settings.restTime = newSettings.restTime
        // Keep user preferences for sound/haptics
    }
}
