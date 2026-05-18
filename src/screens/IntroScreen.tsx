import { HowToPlay } from '../components/HowToPlay';
import { Stage } from '../components/Stage';
import { send, useIsHost } from '../hooks/useNet';
import { playSfx } from '../hooks/useSound';

export function IntroScreen() {
  const isHost = useIsHost();
  return (
    <Stage focus>
      <HowToPlay
        {...(isHost
          ? {
              doneLabel: 'Let’s play!',
              onDone: () => {
                playSfx('reveal');
                send({ t: 'BEGIN_PLAY' });
              },
            }
          : { note: 'Get ready — the host is starting…' })}
      />
    </Stage>
  );
}
