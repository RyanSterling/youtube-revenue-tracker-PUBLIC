interface SourceIconProps {
  type: string;
  size?: number;
  className?: string;
}

export function SourceIcon({ type, size = 16, className = '' }: SourceIconProps) {
  const iconSize = { width: size, height: size };

  switch (type) {
    case 'youtube':
      return (
        <svg {...iconSize} viewBox="0 0 160 160" fill="none" className={className}>
          <path d="M130.571 54.5525C129.336 49.9882 125.77 46.4227 121.206 45.1877C112.995 42.9482 79.9464 42.9482 79.9464 42.9482C79.9464 42.9482 46.8981 43.0161 38.687 45.2555C34.1227 46.4906 30.5572 50.056 29.3222 54.6203C26.8385 69.2104 25.8748 91.4417 29.39 105.448C30.6251 110.012 34.1905 113.578 38.7548 114.813C46.966 117.052 80.0143 117.052 80.0143 117.052C80.0143 117.052 113.063 117.052 121.274 114.813C125.838 113.578 129.403 110.012 130.639 105.448C133.258 90.8377 134.065 68.62 130.571 54.5525Z" fill="#FF0000"/>
          <path d="M69.4279 95.88L96.8437 80.0005L69.4279 64.1211V95.88Z" fill="white"/>
        </svg>
      );

    case 'tiktok':
      return (
        <svg {...iconSize} viewBox="0 0 160 160" fill="none" className={className}>
          <rect width="160" height="160" rx="28" fill="black"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M100.4 24.3994C99.8667 22.1328 99.4667 19.7328 99.4667 17.3328H79.4667V57.3328V63.8661V98.1327C79.4667 107.466 71.4667 115.066 62.1333 115.066C52.8 115.066 45.3333 107.599 45.3333 98.2661C45.3333 88.9327 52.9333 81.3327 62.2667 81.3327C64.1333 81.3327 65.8667 81.5994 67.6 82.1327V60.3994C65.8667 60.1328 64.1333 59.9994 62.2667 59.9994C41.0667 59.9994 24 77.0661 24 98.2661C24 119.333 41.0667 136.533 62.2667 136.533C83.0667 136.533 100.4 119.866 100.933 99.1994V98.2661V57.7328C108.8 63.0661 117.867 66.2661 128 66.2661V45.7328C114.8 45.7328 103.6 36.6661 100.4 24.3994Z" fill="#25F4EE"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M107.066 31.0662C106.533 28.7995 106.133 26.3995 106.133 23.9995H86.1326V63.9995V70.5328V104.799C86.1326 114.133 78.1326 121.733 68.7992 121.733C59.4659 121.733 51.9992 114.266 51.9992 104.933C51.9992 95.5995 59.5992 87.9995 68.9326 87.9995C70.7992 87.9995 72.5326 88.2662 74.2659 88.7995V67.0662C72.5326 66.7995 70.7992 66.6662 68.9326 66.6662C47.7326 66.6662 30.6659 83.7328 30.6659 104.933C30.6659 125.999 47.7326 143.199 68.9326 143.199C89.7326 143.199 107.066 126.533 107.599 105.866V104.933V64.3995C115.466 69.7328 124.533 72.9328 134.666 72.9328V52.3995C121.466 52.3995 110.266 43.3328 107.066 31.0662Z" fill="white"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M100.399 23.9995C100.399 24.1328 100.533 24.2662 100.533 24.3995C102.266 30.9328 106.266 36.6662 111.599 40.5328C109.599 37.7328 108.133 34.5328 107.199 31.0662C106.666 28.7995 106.266 26.3995 106.266 23.9995H100.399ZM127.999 51.5995V66.1328C117.733 66.1328 108.799 62.9328 100.933 57.5995V98.1328V99.0662C100.399 119.733 83.066 136.399 62.266 136.399C53.466 136.399 45.1993 133.333 38.7993 128.4C45.7326 137.333 56.666 143.066 68.9327 143.066C89.7327 143.066 107.066 126.4 107.599 105.733V104.799V64.3995C115.466 69.7328 124.533 72.9328 134.666 72.9328V52.3995C132.399 52.3995 130.133 52.1328 127.999 51.5995ZM67.5993 66.6662V82.1328C65.866 81.5995 64.1327 81.3328 62.266 81.3328C52.9327 81.3328 45.3326 88.9328 45.3326 98.2662C45.3326 104.666 48.9326 110.133 54.1326 113.066C52.7993 110.666 51.9993 107.866 51.9993 104.933C51.9993 95.5995 59.5993 87.9995 68.9327 87.9995C70.7993 87.9995 72.5327 88.2662 74.266 88.7995V67.0662C72.5327 66.7995 70.7993 66.6662 68.9327 66.6662C68.3993 66.6662 67.9993 66.6662 67.5993 66.6662Z" fill="#FE2C55"/>
        </svg>
      );

    case 'instagram':
      return (
        <svg {...iconSize} viewBox="0 0 160 160" fill="none" className={className}>
          <defs>
            <radialGradient id="ig-gradient-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(42 172) rotate(-90) scale(158 148)">
              <stop stopColor="#FFDD55"/>
              <stop offset="0.1" stopColor="#FFDD55"/>
              <stop offset="0.5" stopColor="#FF543E"/>
              <stop offset="1" stopColor="#C837AB"/>
            </radialGradient>
            <radialGradient id="ig-gradient-2" cx="0" cy="0" r="1" gradientTransform="matrix(14 69 -288 57 -28 11)" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3771C8"/>
              <stop offset="0.128" stopColor="#3771C8"/>
              <stop offset="1" stopColor="#6600FF" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="160" height="160" rx="36" fill="url(#ig-gradient-1)"/>
          <rect width="160" height="160" rx="36" fill="url(#ig-gradient-2)"/>
          <circle cx="80" cy="80" r="25" stroke="white" strokeWidth="10"/>
          <rect x="25" y="25" width="110" height="110" rx="30" stroke="white" strokeWidth="10" fill="none"/>
          <circle cx="112" cy="48" r="8" fill="white"/>
        </svg>
      );

    case 'email':
      return (
        <svg {...iconSize} viewBox="0 0 160 160" fill="none" className={className}>
          <rect width="160" height="160" rx="28" fill="#484848"/>
          <path d="M43.5441 58.0197C43.5441 53.9929 46.8084 50.7285 50.8352 50.7285H109.165C113.192 50.7285 116.456 53.9929 116.456 58.0197V61.235L80 79.463L43.5441 61.235V58.0197Z" fill="white"/>
          <path d="M43.5441 69.3865V101.766C43.5441 105.793 46.8084 109.058 50.8352 109.058H109.165C113.192 109.058 116.456 105.793 116.456 101.766V69.3865L83.2606 85.984C81.2081 87.0106 78.7918 87.0106 76.7393 85.984L43.5441 69.3865Z" fill="white"/>
        </svg>
      );

    case 'meta':
      return (
        <svg {...iconSize} viewBox="0 0 156 156" fill="none" className={className}>
          <g clipPath="url(#meta-clip0)">
            <path fillRule="evenodd" clipRule="evenodd" d="M0 155.649H155.649V0H0V155.649Z" fill="white"/>
            <g clipPath="url(#meta-clip1)">
              <path d="M34.8016 89.4564C34.8016 93.6536 35.7195 96.8698 36.9247 98.8178C38.5013 101.368 40.8486 102.447 43.245 102.447C46.3421 102.447 49.1659 101.684 54.6173 94.1371C58.9827 88.0971 64.1258 79.6116 67.5873 74.2863L73.4521 65.2753C77.5232 59.0181 82.2318 52.0602 87.6412 47.3445C92.0486 43.4906 96.8134 41.3535 101.599 41.3535C109.643 41.3535 117.302 46.0132 123.16 54.7649C129.578 64.3434 132.689 76.4024 132.689 88.8538C132.689 96.2532 131.232 101.691 128.751 105.993C126.355 110.148 121.688 114.296 113.826 114.296V102.447C120.553 102.447 122.235 96.2602 122.235 89.1832C122.235 79.0931 119.88 67.896 114.702 59.894C111.031 54.2183 106.266 50.7499 101.025 50.7499C95.3629 50.7499 90.8014 55.0311 85.6723 62.6547C82.9466 66.7048 80.1508 71.6447 77.0117 77.2152L73.5502 83.3463C66.6063 95.6716 64.8475 98.4814 61.3721 103.113C55.29 111.22 50.0908 114.296 43.245 114.296C35.1309 114.296 29.9948 110.779 26.8207 105.481C24.2211 101.158 22.9458 95.4894 22.9458 89.036L34.8016 89.4564Z" fill="#0081FB"/>
              <path d="M32.293 55.5987C37.7304 47.2184 45.5712 41.3535 54.5682 41.3535C59.7743 41.3535 64.9525 42.8951 70.3619 47.3165C76.2758 52.1443 82.5821 60.1042 90.4509 73.2143L93.2677 77.9159C100.078 89.2672 103.953 95.1041 106.217 97.8578C109.132 101.396 111.178 102.447 113.826 102.447C120.553 102.447 122.235 96.2602 122.235 89.1832L132.689 88.8538C132.689 96.2532 131.232 101.691 128.751 105.993C126.355 110.148 121.688 114.296 113.826 114.296C108.942 114.296 104.612 113.231 99.8262 108.719C96.1476 105.25 91.8453 99.091 88.538 93.5485L78.7002 77.0961C73.7603 68.8419 69.2268 62.6898 66.6061 59.901C63.7893 56.902 60.1597 53.2794 54.379 53.2794C49.6913 53.2794 45.7183 56.5657 42.39 61.5967L32.293 55.5987Z" fill="url(#meta-gradient0)"/>
              <path d="M54.3791 53.2794C49.6914 53.2794 45.7185 56.5657 42.3902 61.5967C37.6815 68.7018 34.8016 79.2893 34.8016 89.4564C34.8016 93.6536 35.7195 96.8698 36.9247 98.8178L26.8207 105.481C24.2211 101.158 22.9458 95.4894 22.9458 89.036C22.9458 77.2923 26.169 65.0511 32.2931 55.5987C37.7305 47.2184 45.5713 41.3535 54.5683 41.3535L54.3791 53.2794Z" fill="url(#meta-gradient1)"/>
            </g>
          </g>
          <defs>
            <linearGradient id="meta-gradient0" x1="46.2299" y1="86.037" x2="121.793" y2="89.8558" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0064E1"/>
              <stop offset="0.4" stopColor="#0064E1"/>
              <stop offset="0.8" stopColor="#0073EE"/>
              <stop offset="1" stopColor="#0082FB"/>
            </linearGradient>
            <linearGradient id="meta-gradient1" x1="40.1199" y1="94.4384" x2="40.1199" y2="66.5576" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0082FB"/>
              <stop offset="1" stopColor="#0064E0"/>
            </linearGradient>
            <clipPath id="meta-clip0">
              <rect width="155.649" height="155.649" rx="34" fill="white"/>
            </clipPath>
            <clipPath id="meta-clip1">
              <rect width="109.799" height="72.9427" fill="white" transform="translate(22.9248 41.3535)"/>
            </clipPath>
          </defs>
        </svg>
      );

    default:
      // Custom/other - generic link icon
      return (
        <svg {...iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}

export const SOURCE_PRESETS = [
  { type: 'youtube', label: 'YouTube', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { type: 'tiktok', label: 'TikTok', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { type: 'instagram', label: 'Instagram', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { type: 'email', label: 'Email', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { type: 'meta', label: 'Meta', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
] as const;

export function getSourceColor(type: string): string {
  const preset = SOURCE_PRESETS.find(p => p.type === type);
  return preset?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function getSourceLabel(type: string): string {
  const preset = SOURCE_PRESETS.find(p => p.type === type);
  return preset?.label || type;
}
