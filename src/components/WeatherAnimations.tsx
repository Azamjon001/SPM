import { motion } from 'motion/react';

// Falling Stars Animation (Night)
export function FallingStars() {
  const stars = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 2
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-1 h-1 bg-white rounded-full shadow-lg"
          style={{ left: `${star.left}%`, top: '-20px' }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, -50],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'linear'
          }}
        >
          <div className="absolute inset-0 bg-white blur-sm" />
        </motion.div>
      ))}
    </div>
  );
}

// Moon Animation (Night)
export function MoonAnimation() {
  return (
    <div className="absolute right-4 top-2">
      <div className="relative w-12 h-12">
        {/* Moon body with shadows only */}
        <div className="absolute inset-0 bg-yellow-100 rounded-full shadow-[0_0_20px_8px_rgba(254,240,138,0.6)] border-2 border-yellow-200" 
             style={{
               boxShadow: '0 0 20px 8px rgba(254, 240, 138, 0.6), inset -2px -2px 8px rgba(0, 0, 0, 0.1), inset 2px 2px 8px rgba(255, 255, 255, 0.3)'
             }}
        >
          {/* Craters */}
          <div className="absolute top-3 left-3 w-2 h-2 bg-gray-300/40 rounded-full shadow-inner" />
          <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-gray-300/30 rounded-full shadow-inner" />
          <div className="absolute top-5 right-4 w-1 h-1 bg-gray-300/20 rounded-full shadow-inner" />
        </div>
      </div>
    </div>
  );
}

// Sun Animation (Day)
export function SunAnimation() {
  return (
    <div className="absolute right-4 top-2">
      <div className="relative w-12 h-12">
        {/* Sun core with shadows only */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 rounded-full border-2 border-yellow-200"
             style={{
               boxShadow: '0 0 30px 10px rgba(251, 191, 36, 0.7), 0 0 15px 5px rgba(251, 191, 36, 0.5), inset -3px -3px 10px rgba(0, 0, 0, 0.1), inset 3px 3px 10px rgba(255, 255, 255, 0.4)'
             }}
        >
          {/* Inner highlight */}
          <div className="absolute top-2 left-2 w-3 h-3 bg-yellow-100 rounded-full opacity-60 blur-sm" />
        </div>
      </div>
    </div>
  );
}

// Animated Clouds
export function CloudsAnimation({ isDark = false }: { isDark?: boolean }) {
  const clouds = [
    { id: 1, top: '5%', delay: 0, duration: 25, size: 'medium' },
    { id: 2, top: '20%', delay: 3, duration: 30, size: 'large' },
    { id: 3, top: '12%', delay: 7, duration: 28, size: 'small' },
    { id: 4, top: '35%', delay: 10, duration: 35, size: 'medium' },
    { id: 5, top: '8%', delay: 15, duration: 32, size: 'large' },
    { id: 6, top: '28%', delay: 20, duration: 27, size: 'small' },
    { id: 7, top: '15%', delay: 12, duration: 33, size: 'medium' },
    { id: 8, top: '40%', delay: 18, duration: 29, size: 'large' },
  ];

  const getCloudSize = (size: string) => {
    switch(size) {
      case 'small':
        return { w1: 16, h1: 6, w2: 20, h2: 8, w3: 14, h3: 6 };
      case 'large':
        return { w1: 28, h1: 11, w2: 32, h2: 14, w3: 24, h3: 11 };
      default: // medium
        return { w1: 20, h1: 8, w2: 24, h2: 10, w3: 16, h3: 8 };
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {clouds.map((cloud) => {
        const sizes = getCloudSize(cloud.size);
        return (
          <motion.div
            key={cloud.id}
            className="absolute"
            style={{ top: cloud.top, left: '-200px' }}
            animate={{
              x: ['0vw', '110vw']
            }}
            transition={{
              duration: cloud.duration,
              delay: cloud.delay,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            <div className={`relative ${isDark ? 'opacity-25' : 'opacity-50'}`}>
              <div 
                className={`${isDark ? 'bg-gray-300' : 'bg-white'} rounded-full shadow-lg`} 
                style={{ width: `${sizes.w1 * 4}px`, height: `${sizes.h1 * 4}px` }}
              />
              <div 
                className={`absolute ${isDark ? 'bg-gray-300' : 'bg-white'} rounded-full shadow-lg`} 
                style={{ 
                  width: `${sizes.w2 * 4}px`, 
                  height: `${sizes.h2 * 4}px`,
                  top: `${sizes.h1 * 2}px`,
                  left: `${sizes.w1 * 2}px`
                }}
              />
              <div 
                className={`absolute ${isDark ? 'bg-gray-300' : 'bg-white'} rounded-full shadow-lg`} 
                style={{ 
                  width: `${sizes.w3 * 4}px`, 
                  height: `${sizes.h3 * 4}px`,
                  top: '0px',
                  left: `${sizes.w1 * 6}px`
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Snow Animation
export function SnowAnimation() {
  const snowflakes = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: 2 + Math.random() * 4
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute bg-white rounded-full opacity-80"
          style={{
            left: `${flake.left}%`,
            top: '-20px',
            width: `${flake.size}px`,
            height: `${flake.size}px`
          }}
          animate={{
            y: ['0vh', '120vh'],
            x: [0, Math.sin(flake.id) * 50],
            rotate: [0, 360]
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}

// Rain Animation
export function RainAnimation() {
  const raindrops = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 0.5 + Math.random() * 0.5
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {raindrops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute w-0.5 h-8 bg-blue-400 opacity-60"
          style={{ left: `${drop.left}%`, top: '-40px' }}
          animate={{
            y: ['0vh', '120vh']
          }}
          transition={{
            duration: drop.duration,
            delay: drop.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
}

// Storm Animation (Rain + Lightning)
export function StormAnimation() {
  return (
    <>
      <RainAnimation />
      <div className="fixed inset-0 pointer-events-none z-10">
        <motion.div
          className="absolute inset-0 bg-yellow-200"
          animate={{
            opacity: [0, 0, 0, 0.3, 0, 0.4, 0, 0, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatDelay: 5
          }}
        />
      </div>
    </>
  );
}