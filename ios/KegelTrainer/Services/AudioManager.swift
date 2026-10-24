import Foundation
import AudioToolbox
import AVFoundation

class AudioManager {
    static let shared = AudioManager()
    
    // System sounds for simplicity, can be replaced with custom sound files
    // 1057: Tink, 1103: Tink (different pitch), 1016: Tweet sent
    private let contractSoundID: SystemSoundID = 1057
    private let relaxSoundID: SystemSoundID = 1103
    private let finishSoundID: SystemSoundID = 1016
    
    func playContract() {
        AudioServicesPlaySystemSound(contractSoundID)
    }
    
    func playRelax() {
        AudioServicesPlaySystemSound(relaxSoundID)
    }
    
    func playFinish() {
        AudioServicesPlaySystemSound(finishSoundID)
    }
}

class HapticManager {
    static let shared = HapticManager()
    
    func vibrateContract() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
    
    func vibrateRelax() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
    
    func vibrateFinish() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        // Additional haptic for finish
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            generator.notificationOccurred(.success)
        }
    }
}
