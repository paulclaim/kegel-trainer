import SwiftUI

@main
struct KegelTrainerApp: App {
    @StateObject private var settingsManager = SettingsManager.shared
    @StateObject private var historyManager = HistoryManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settingsManager)
                .environmentObject(historyManager)
        }
    }
}
