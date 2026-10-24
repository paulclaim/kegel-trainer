import SwiftUI

struct TrainingView: View {
    @StateObject private var viewModel = TrainingViewModel()
    @EnvironmentObject var settingsManager: SettingsManager
    
    var body: some View {
        VStack(spacing: 30) {
            // Header
            Text("Kegel Trainer")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top)
            
            // Progress Circle & Timer
            ZStack {
                CircularProgressView(progress: viewModel.progress, color: viewModel.phase.color)
                    .frame(width: 250, height: 250)
                
                VStack {
                    Text(viewModel.actionText)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(viewModel.phase.color)
                    
                    Text("\(viewModel.timerText)s")
                        .font(.system(size: 50, weight: .bold, design: .rounded))
                }
            }
            .padding()
            
            // Stats Row
            HStack(spacing: 40) {
                VStack {
                    Text("组数")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("\(viewModel.currentSet) / \(settingsManager.totalSets)")
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                VStack {
                    Text("次数")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("\(viewModel.currentRep) / \(settingsManager.repsPerSet)")
                        .font(.title2)
                        .fontWeight(.bold)
                }
            }
            
            Spacer()
            
            // Controls
            HStack(spacing: 30) {
                Button(action: {
                    viewModel.reset()
                }) {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.title)
                        .foregroundColor(.gray)
                        .frame(width: 60, height: 60)
                        .background(Color.gray.opacity(0.2))
                        .clipShape(Circle())
                }
                
                Button(action: {
                    if viewModel.isRunning {
                        viewModel.pause()
                    } else {
                        viewModel.start()
                    }
                }) {
                    Image(systemName: viewModel.isRunning ? "pause.fill" : "play.fill")
                        .font(.largeTitle)
                        .foregroundColor(.white)
                        .frame(width: 80, height: 80)
                        .background(viewModel.phase.color)
                        .clipShape(Circle())
                        .shadow(radius: 5)
                }
            }
            .padding(.bottom, 50)
        }
        .padding()
    }
}
