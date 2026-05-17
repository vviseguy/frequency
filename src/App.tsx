import { ConnectionBadge } from './components/ConnectionBadge';
import { FloatingEmojis } from './components/FloatingEmojis';
import { useWakeLock } from './hooks/useWakeLock';
import { useRoom } from './hooks/useNet';
import { useNetStore } from './net/netStore';
import { ClueScreen } from './screens/ClueScreen';
import { FinalRecapScreen } from './screens/FinalRecapScreen';
import { GuessScreen } from './screens/GuessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RevealScreen } from './screens/RevealScreen';
import { RoundIntroScreen } from './screens/RoundIntroScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';

export default function App() {
  const room = useRoom();
  const role = useNetStore((s) => s.role);
  useWakeLock(role === 'host');

  return (
    <>
      {!room || role === 'none' ? (
        <HomeScreen />
      ) : room.phase === 'LOBBY' ? (
        <LobbyScreen room={room} />
      ) : room.phase === 'ROUND_INTRO' ? (
        <RoundIntroScreen room={room} />
      ) : room.phase === 'CLUE' ? (
        <ClueScreen room={room} />
      ) : room.phase === 'GUESS' ? (
        <GuessScreen room={room} />
      ) : room.phase === 'REVEAL' ? (
        <RevealScreen room={room} />
      ) : room.phase === 'SCOREBOARD' ? (
        <ScoreboardScreen room={room} />
      ) : (
        <FinalRecapScreen room={room} />
      )}

      <FloatingEmojis />
      <ConnectionBadge />
    </>
  );
}
