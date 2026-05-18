import { useEffect, useRef } from 'react';
import { ConnectionBadge } from './components/ConnectionBadge';
import { FloatingEmojis } from './components/FloatingEmojis';
import { Toaster } from './components/Toaster';
import { useWakeLock } from './hooks/useWakeLock';
import { netCtl, useRoom } from './hooks/useNet';
import { useNetStore } from './net/netStore';
import { ClueScreen } from './screens/ClueScreen';
import { FinalRecapScreen } from './screens/FinalRecapScreen';
import { GuessScreen } from './screens/GuessScreen';
import { HomeScreen } from './screens/HomeScreen';
import { IntroScreen } from './screens/IntroScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RevealScreen } from './screens/RevealScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';

export default function App() {
  const room = useRoom();
  const role = useNetStore((s) => s.role);
  useWakeLock(role === 'host');

  // Browser Back = "leave the room → Home". We drive this purely with a
  // History state entry (no URL change), so the clean-URL / refresh→Home
  // behavior is untouched. (Forward-restore is intentionally not done — it
  // would require re-joining, i.e. the auto-rejoin we removed.)
  const inRoom = !!room && role !== 'none';
  const wasInRoom = useRef(false);
  useEffect(() => {
    if (inRoom && !wasInRoom.current) history.pushState({ frqRoom: true }, '');
    wasInRoom.current = inRoom;
  }, [inRoom]);
  useEffect(() => {
    const onPop = () => {
      if (wasInRoom.current) netCtl.leave();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
      ) : room.phase === 'INTRO' ? (
        <IntroScreen />
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
      <Toaster />
    </>
  );
}
