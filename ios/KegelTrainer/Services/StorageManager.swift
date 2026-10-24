import Foundation

class StorageManager {
    static let shared = StorageManager()
    
    private let fileManager = FileManager.default
    private let recordsFileName = "training_records.json"
    private let settingsKey = "kegel_settings"
    
    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    }
    
    private var recordsURL: URL {
        documentsDirectory.appendingPathComponent(recordsFileName)
    }
    
    // MARK: - Records
    
    func saveRecords(_ records: [TrainingSession]) {
        do {
            let data = try JSONEncoder().encode(records)
            try data.write(to: recordsURL)
        } catch {
            print("Failed to save records: \(error)")
        }
    }
    
    func loadRecords() -> [TrainingSession] {
        guard fileManager.fileExists(atPath: recordsURL.path) else { return [] }
        
        do {
            let data = try Data(contentsOf: recordsURL)
            return try JSONDecoder().decode([TrainingSession].self, from: data)
        } catch {
            print("Failed to load records: \(error)")
            return []
        }
    }
    
    // MARK: - Settings
    
    func saveSettings(_ settings: Settings) {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }
    
    func loadSettings() -> Settings {
        guard let data = UserDefaults.standard.data(forKey: settingsKey),
              let settings = try? JSONDecoder().decode(Settings.self, from: data) else {
            return Settings()
        }
        return settings
    }
}
