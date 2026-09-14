"use client";

import { useSyncExternalStore } from "react";

const KEY = "byr:session-nickname";
const ADJECTIVES = ["Cosmic", "Sneaky", "Mighty", "Dapper", "Witty", "Turbo", "Sunny", "Brave", "Chill", "Sparkly", "Nimble", "Lucky"];
const ANIMALS = ["Otter", "Panda", "Penguin", "Capybara", "Badger", "Fox", "Koala", "Quokka", "Lynx", "Platypus", "Alpaca", "Gecko"];
let nickname = "";

function readNickname() {
  if (nickname) return nickname;
  try { const saved = sessionStorage.getItem(KEY); if (saved && /^[A-Za-z]+ [A-Za-z]+ \d{2}$/.test(saved)) return nickname = saved; } catch { /* storage can be disabled */ }
  const random = crypto.getRandomValues(new Uint32Array(3));
  nickname = `${ADJECTIVES[random[0] % ADJECTIVES.length]} ${ANIMALS[random[1] % ANIMALS.length]} ${10 + random[2] % 90}`;
  try { sessionStorage.setItem(KEY, nickname); } catch { /* keep the in-memory nickname */ }
  return nickname;
}

const subscribe = () => () => {};
export function useSessionNickname() { return useSyncExternalStore(subscribe, readNickname, () => ""); }
