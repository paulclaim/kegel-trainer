import SwiftUI
import Combine

enum TrainingPhase: String {
    case ready = "准备"
    case contract = "夹紧"
    case relax = "放松"
    case rest = "休息"
    case completed = "完成"
    
    var color: Color {
        switch self {
        case .ready, .relax: return .blue.opacity(0.3)
        case .contract: return .pink
        case .rest: return .green
        case .completed: return .purple
        }
    }
}

class TrainingViewModel: ObservableObject {
    // Dependencies
    private let audioManager = AudioManager.shared
    private let hapticManager = HapticManager.shared
    private let settingsManager = SettingsManager.shared
    private let historyManager = HistoryManager.shared
    
    // State
    @Published var phase: TrainingPhase = .ready
    @Published var currentSet: Int = 1
    @Published var currentRep: Int = 1
    @Published var timeLeft: Double = 0
    @Published var totalDuration: Double = 0 // Max time for current phase (for progress bar)
    @Published var isRunning: Bool = false
    @Published var isPaused: Bool = false
    
    private var timer: Timer?
    
    // Computed properties for UI
    var progress: Double {
        guard totalDuration > 0 else { return 0 }
        return 1.0 - (timeLeft / totalDuration)
    }
    
    var actionText: String {
        phase.rawValue
    }
    
    var timerText: String {
        String(format: "%.0f", ceil(timeLeft))
    }
    
    // Actions
    func start() {
        if isPaused {
            resume()
        } else {
            beginSession()
        }
    }
    
    func pause() {
        isPaused = true
        isRunning = false
        timer?.invalidate()
    }
    
    func resume() {
        isPaused = false
        isRunning = true
        startTimer()
    }
    
    func reset() {
        stopTimer()
        phase = .ready
        currentSet = 1
        currentRep = 1
        timeLeft = 0
        totalDuration = 0
        isRunning = false
        isPaused = false
    }
    
    private func beginSession() {
        reset()
        isRunning = true
        startPhase(.contract)
    }
    
    private func startPhase(_ newPhase: TrainingPhase) {
        phase = newPhase
        
        switch phase {
        case .contract:
            totalDuration = Double(settingsManager.contractTime)
            if settingsManager.soundEnabled { audioManager.playContract() }
            if settingsManager.hapticsEnabled { hapticManager.vibrateContract() }
        case .relax:
            totalDuration = Double(settingsManager.relaxTime)
            if settingsManager.soundEnabled { audioManager.playRelax() }
            if settingsManager.hapticsEnabled { hapticManager.vibrateRelax() }
        case .rest:
            totalDuration = Double(settingsManager.restTime)
            // Optional: sound for rest
        case .completed:
            completeSession()
            return
        case .ready:
            return
        }
        
        timeLeft = totalDuration
        startTimer()
    }
    
    private func startTimer() {
        timer?.invalidate()
        let startDate = Date()
        let initialTimeLeft = timeLeft
        
        // Use a more precise timer loop
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            let elapsed = Date().timeIntervalSince(startDate)
            self.timeLeft = max(0, initialTimeLeft - elapsed)
            
            if self.timeLeft <= 0 {
                self.nextStep()
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func nextStep() {
        stopTimer()
        
        switch phase {
        case .contract:
            startPhase(.relax)
        case .relax:
            if currentRep < settingsManager.repsPerSet {
                currentRep += 1
                startPhase(.contract)
            } else {
                if currentSet < settingsManager.totalSets {
                    currentSet += 1
                    currentRep = 1
                    startPhase(.rest)
                } else {
                    startPhase(.completed)
                }
            }
        case .rest:
            startPhase(.contract)
        default:
            break
        }
    }
    
    private func completeSession() {
        isRunning = false
        if settingsManager.soundEnabled { audioManager.playFinish() }
        if settingsManager.hapticsEnabled { hapticManager.vibrateFinish() }
        
        // Calculate duration
        let settings = settingsManager.settings
        let activeTime = settings.totalSets * settings.repsPerSet * (settings.contractTime + settings.relaxTime)
        let restTime = max(0, settings.totalSets - 1) * settings.restTime
        let durationMinutes = Double(activeTime + restTime) / 60.0
        
        let session = TrainingSession(
            date: Date(),
            sets: settings.totalSets,
            reps: settings.repsPerSet,
            duration: durationMinutes,
            contractTime: settings.contractTime,
            relaxTime: settings.relaxTime
        )
        
        historyManager.addSession(session)
    }
}
