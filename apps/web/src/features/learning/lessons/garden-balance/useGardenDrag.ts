import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Activation, Ghost } from '../../components/garden-balance/GardenStage';
import type { Handling } from '../../components/garden-balance/garden-scenes';
import { bindObjectDrag } from '../../interaction/object-drag';
import type { Scene } from './garden-story';
import type { GardenStory } from './useGardenStory';

type Movable = 'leaf' | 'apple';
type Held = { shot: Scene; key: string; part: Movable };
type Drag = { key: string; ghost?: Ghost; over?: string };

const look: Record<Movable, Pick<Ghost, 'sprite' | 'size'>> = {
  leaf: { sprite: 'garden-cabbage', size: 76 },
  apple: { sprite: 'garden-apple', size: 57 },
};

function movable(part: string | undefined): part is Movable {
  return part === 'leaf' || part === 'apple';
}

function placeAt({ clientX, clientY }: PointerEvent) {
  return document.elementFromPoint(clientX, clientY)?.closest<SVGElement>('[data-place]')?.dataset
    .place;
}

function toWorld(surface: SVGSVGElement, { clientX, clientY }: PointerEvent) {
  const matrix = surface.getScreenCTM()?.inverse();
  const point = new DOMPoint(clientX, clientY);
  return matrix ? point.matrixTransform(matrix) : point;
}

// Moving a cabbage or an apple into the basket, by dragging it there or by
// tapping it and then the basket. Tapping the other props acts on them
// directly. A choice made in an earlier scene no longer counts.
export function useGardenDrag(story: GardenStory) {
  const world = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>();
  const [held, setHeld] = useState<Held>();
  const selected = held?.shot === story.state.shot ? held : undefined;

  function putInBasket(part: Movable) {
    setHeld(undefined);
    story.act({ kind: 'drop', part, place: 'basket' });
  }
  const dropped = useEffectEvent(putInBasket);

  useEffect(() => {
    const surface = world.current;
    if (!surface) return;
    return bindObjectDrag(surface, (event) => {
      const node =
        event.target instanceof Element ? event.target.closest<SVGElement>('[data-part]') : null;
      const part = node?.dataset.part;
      const key = node?.dataset.key;
      if (!movable(part) || !key) return;
      return {
        move(moved) {
          const { x, y } = toWorld(surface, moved);
          setDrag({ key, ghost: { ...look[part], x, y }, over: placeAt(moved) });
        },
        drop(released) {
          setDrag(undefined);
          if (placeAt(released) === 'basket') dropped(part);
        },
        cancel: () => setDrag(undefined),
      };
    });
  }, []);

  const handling: Handling = {
    selected: selected?.key,
    lifted: drag?.ghost ? drag.key : undefined,
    over: drag?.over,
  };

  return {
    world,
    handling,
    ghost: drag?.ghost,
    activate({ part, key, place }: Activation) {
      if (part === 'exchange' || part === 'replace') story.act({ kind: 'tap', part });
      else if (movable(part) && key)
        setHeld(selected?.key === key ? undefined : { shot: story.state.shot, key, part });
      else if (place === 'basket' && selected) putInBasket(selected.part);
    },
  };
}
