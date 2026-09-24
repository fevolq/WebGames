import { useId } from 'react';
import type { WorldId } from './model';

// Local vector landscapes: each world has its own horizon, joined by the same winding path.
export function WorldScene({ world, className }: { world: WorldId; className?: string }) {
  const id = useId().replace(/:/g, '');
  const modern = world === 'modern';
  const ancient = world === 'ancient';
  return <svg className={className} viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}sky`} x2="0" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor={modern ? '#e5ede5' : ancient ? '#ede6d6' : '#dce6eb'} /><stop offset="1" stopColor={modern ? '#f5f4e8' : ancient ? '#f8f1e4' : '#eef2ef'} /></linearGradient></defs>
    <path fill={`url(#${id}sky)`} d="M0 0h640v260H0z" />
    <circle cx="487" cy="64" r={modern ? 24 : 30} fill={modern ? '#efc97d' : ancient ? '#dab378' : '#f8f7e8'} />
    <path d="M0 158 72 102 127 128 194 76 276 143 331 99 415 157 491 107 553 140 640 85V260H0Z" fill={modern ? '#bccdbe' : ancient ? '#c3c4ac' : '#abbec5'} />
    <path d="M0 204 68 161 149 183 247 124 332 170 427 141 525 178 640 123V260H0Z" fill={modern ? '#8fab98' : ancient ? '#a5ad91' : '#789798'} />
    {modern ? <>
      <path d="M55 193V129h45v64M109 193V104h40v89M163 193V140h55v53M515 192V92h28v100M551 192V117h38v75" fill="#cad6c7" />
      <path d="M64 138h9v12h-9m14-12h9v12h-9m-14 13h9v12h-9m39-39h8v13h-8m0 10h8v13h-8m14-36h8v13h-8m0 10h8v13h-8m395-25h9v12h-9m0 8h9v12h-9" fill="#879f8e" />
      <path d="M261 224v-73h115v73" fill="#ebdfc5" /><path d="m247 154 68-38 76 38H247Z" fill="#526f61" />
      <path d="M277 174h29v35h-29m45-35h36v50h-36" fill="#536e62" /><path d="M324 177h31v31h-31" fill="#f0cb7d" />
      <path d="M263 162h111" stroke="#b99362" strokeWidth="7" /><path d="M227 208h-51m8 0v18m34-18v18" stroke="#536e62" strokeWidth="5" />
      <path d="M414 135v91m-8-83h35v5" stroke="#536e62" strokeWidth="4" /><circle cx="441" cy="153" r="7" fill="#f0cb7d" />
    </> : ancient ? <>
      <path d="M226 201v-65h160v65" fill="#e8dcc0" /><path d="M217 142h181l-36-22H253l-36 22Z" fill="#606f5e" /><path d="M231 115h151l-28-20h-96l-27 20Z" fill="#607460" />
      <path d="M251 140v60m33-60v60m45-60v60m34-60v60" stroke="#947b54" strokeWidth="7" /><path d="M256 116h100v5H256Z" fill="#c3a16c" />
      <path d="M45 216q58-67 116 0" stroke="#b2a68c" strokeWidth="13" /><path d="M51 216q52-46 104 0" stroke="#eee6d5" strokeWidth="6" />
      <path d="M23 231q82-21 172 0t153 0" stroke="#dfe4d6" strokeWidth="3" />
      <path d="M477 194v-73m-18 17h40m-32-13h20" stroke="#6f8269" strokeWidth="5" /><path d="m448 119 28-36 32 36-22-6 10 26-20-9-22 9 12-26Z" fill="#70896f" />
    </> : <>
      <path d="m200 227 74-168 24 54 26-24 69 138" fill="#526f73" /><path d="m284 102 37-74 54 126-40-25-18 40-22-49Z" fill="#6b8889" />
      <path d="m417 202 59-99 31 47 30-25 56 77" fill="#547476" />
      <path d="M270 108h71l-14-12h-44l-13 12Z" fill="#e5d9bc" /><path d="M282 109v18h47v-18" fill="#bac7b8" /><path d="m277 94 28-12 32 12" fill="#dfd8ba" />
      <path d="M0 191q91-30 180-5t147-1 156-1 157-9v29q-79 31-161 11t-140 10-173-12T0 227Z" fill="#e3ebe5" fillOpacity=".82" />
      <path d="M393 73q18-15 27 0 10-15 27 0m-41 14q9-7 15 0 6-7 15 0" stroke="#617e80" strokeWidth="2" />
    </>}
    <path d="M0 249q99-38 215-17t214-3 211 0v31H0Z" fill={modern ? '#607e69' : ancient ? '#7c8a69' : '#466969'} />
    <path d={modern ? 'M356 260c-9-13-29-18-34-25s12-10 18-12' : ancient ? 'M357 260c18-13 2-20-16-28s-24-15-26-32' : 'M357 260c-25-21 52-26 36-43s-73-6-92-25'} stroke="#e4d6a8" strokeWidth="12" />
    <path d="m72 65 7-3 6 4m9-9 7-3 6 4" stroke="#819b88" strokeWidth="2" strokeLinecap="round" />
    <circle cx="340" cy="216" r="3" fill="#3b5146" /><path d="M340 220v9m0-5-4 3m4-3 4 2m-4 3-3 5m3-5 3 5" stroke="#3b5146" strokeWidth="2" />
  </svg>;
}
