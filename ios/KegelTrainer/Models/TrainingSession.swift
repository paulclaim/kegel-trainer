import Foundation

struct TrainingSession: Codable, Identifiable {
    var id: UUID = UUID()
    let date: Date
    let sets: Int
    let reps: Int
    let duration: Double // Minutes
    let contractTime: Int
    let relaxTime: Int
    
    // For CSV Export
    func toCSV() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return "\(formatter.string(from: date)),\(sets),\(reps),\(duration),\(contractTime),\(relaxTime)"
    }
}
