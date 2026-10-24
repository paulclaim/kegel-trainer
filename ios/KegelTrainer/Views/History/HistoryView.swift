import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var historyManager: HistoryManager
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("统计")) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("总训练次数")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text("\(historyManager.totalSessions)")
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        Spacer()
                        VStack(alignment: .leading) {
                            Text("总时长 (分)")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text(String(format: "%.1f", historyManager.totalTime))
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        Spacer()
                        VStack(alignment: .leading) {
                            Text("连续天数")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text("\(historyManager.currentStreak)")
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                    }
                    .padding(.vertical)
                }
                
                Section(header: Text("历史记录")) {
                    ForEach(historyManager.sessions) { session in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(formatDate(session.date))
                                    .font(.headline)
                                Text("\(session.sets)组 × \(session.reps)次")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Text(String(format: "%.1f 分钟", session.duration))
                                .font(.subheadline)
                        }
                    }
                }
            }
            .navigationTitle("历史记录")
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
