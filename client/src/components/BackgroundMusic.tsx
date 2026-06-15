import { useEffect, useRef } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import type { BackgroundMusicTrack } from "@gamenite/shared";

//maps each background music to the file path
const musicSources: Record<Exclude<BackgroundMusicTrack, "off">, string> = {
  lofi: "/audio/lofi.mp3",
  arcade: "/audio/arcade.mp3",
  sleepy: "/audio/sleepy.mp3",
};

/**
 * Plays the user's selected background music while they are in the website
 * @returns nothing since the component only controls audio
 */
export default function BackgroundMusic() {
  const { user } = useLoginContext();
  //stores the user's selected background music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedMusic = user.settings.backgroundMusic;
  const selectedVolume = user.settings.backgroundMusicVolume;

  useEffect(() => {
    //stops the music if user chooses off
    if (selectedMusic === "off") {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }

    //creates audio object when song changes
    const audio = new Audio(musicSources[selectedMusic]);
    audio.loop = true;
    audioRef.current = audio;

    //tries to play song, stops if browser doesnt allow
    audio.play().catch(() => {
      audio.pause();
    });

    //stops current song when user changes songs or leaves the app
    return () => {
      audio.pause();
    };
  }, [selectedMusic]);

  //changes volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = selectedVolume;
    }
  }, [selectedVolume]);

  return null;
}
