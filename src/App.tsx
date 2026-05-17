import { ConnectionBadge } from './components/ConnectionBadge';
import { FloatingEmojis } from './components/FloatingEmojis';
import { Menu } from './components/Menu';
import { useWakeLock } from './hooks/useWakeLock';
import { useRoom } from './hooks/useNet';
import { useNetStore } from './net/netStore';
import { ClueScreen } from './screens/ClueScreen';
import { FinalRecapScreen } from './screens/FinalRecapScreen';
import { GuessScreen } from './screens/GuessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RevealScreen } from './screens/RevealScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';

export default function App() {
  const room = useRoom();
  const role = useNetStore((s) => s.role);
  useWakeLock(role === 'host');

  return (
    <>
      <div
        data-testid="phase"
        data-phase={!room || role === 'none' ? 'HOME' : room.phase}
        data-role={role}
        hidden
      />
      {!room || role === 'none' ? (
        <HomeScreen />
      ) : room.phase === 'LOBBY' ? (
        <LobbyScreen room={room} />
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
      <Menu />
      <ConnectionBadge />
    </>
  );
}
