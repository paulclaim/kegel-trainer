import SwiftUI
import Combine

class HistoryManager: ObservableObject {
    static let shared = HistoryManager()
    
    @Published var sessions: [TrainingSession] = []
    
    private init() {
        loadHistory()
    }
    
    func addSession(_ session: TrainingSession) {
        sessions.insert(session, at: 0)
        StorageManager.shared.saveRecords(sessions)
    }
    
    func loadHistory() {
        sessions = StorageManager.shared.loadRecords()
    }
    
    // Computed stats
    var totalSessions: Int { sessions.count }
    
    var totalTime: Double {
        sessions.reduce(0) { $0 + $1.duration }
    }
    
    var currentStreak: Int {
        // Simple streak calculation
        let sortedDates = sessions.map { $0.date }.sorted(by: >)
        guard let firstDate = sortedDates.first else { return 0 }
        
        let calendar = Calendar.current
        if !calendar.isDateInToday(firstDate) && !calendar.isDateInYesterday(firstDate) {
            return 0
        }
        
        var streak = 1
        var previousDate = firstDate
        
        for date in sortedDates.dropFirst() {
            if calendar.isDate(date, inSameDayAs: previousDate) {
                continue
            }
            if let diff = calendar.dateComponents([.day], from: date, to: previousDate).day, diff == 1 {
                streak += 1
                previousDate = date
            } else {
                break
            }
        }
        return streak
    }
}
