import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { onSoundChange, setSound, soundOn } from "../lib/sound";

/* The film's sound switch, in the nav. Off until pressed. */
export default function SoundToggle() {
  const [on, setOn] = useState(soundOn);
  useEffect(() => onSoundChange(setOn), []);
  return <button type="button" className="ed-nav-sound" aria-pressed={on} aria-label={on ? "Turn the film's sound off" : "Turn the film's sound on"} onClick={() => setSound(!on)}>
    {on ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
    <span>{on ? "Sound on" : "Sound"}</span>
  </button>;
}
