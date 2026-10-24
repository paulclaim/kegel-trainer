import SwiftUI

struct ContentView: View {
    @State private var selection = 0
    
    var body: some View {
        TabView(selection: $selection) {
            TrainingView()
                .tabItem {
                    Label("训练", systemImage: "figure.mind.and.body")
                }
                .tag(0)
            
            HistoryView()
                .tabItem {
                    Label("历史", systemImage: "clock.arrow.circlepath")
                }
                .tag(1)
            
            SettingsView()
                .tabItem {
                    Label("设置", systemImage: "gearshape")
                }
                .tag(2)
        }
    }
}
