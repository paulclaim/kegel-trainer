import Foundation

struct Settings: Codable {
    var repsPerSet: Int = 10
    var totalSets: Int = 3
    var contractTime: Int = 5
    var relaxTime: Int = 5
    var restTime: Int = 10
    var soundEnabled: Bool = true
    var hapticsEnabled: Bool = true
    var dailyReminderEnabled: Bool = false
    var reminderTime: Date = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: Date()) ?? Date()
}

enum PresetType: String, CaseIterable, Identifiable {
    case beginner
    case intermediate
    case advanced
    
    var id: String { self.rawValue }
    
    var title: String {
        switch self {
        case .beginner: return "初级"
        case .intermediate: return "中级"
        case .advanced: return "高级"
        }
    }
    
    var settings: Settings {
        switch self {
        case .beginner:
            return Settings(repsPerSet: 5, totalSets: 2, contractTime: 3, relaxTime: 3, restTime: 10)
        case .intermediate:
            return Settings(repsPerSet: 10, totalSets: 3, contractTime: 5, relaxTime: 5, restTime: 10)
        case .advanced:
            return Settings(repsPerSet: 15, totalSets: 4, contractTime: 8, relaxTime: 5, restTime: 15)
        }
    }
}
