import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior
} from 'react-native-track-player';

export async function setupAudioPlayer() {
  await TrackPlayer.setupPlayer();

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop
    ],
    compactCapabilities: [Capability.Play, Capability.Pause]
  });
}
