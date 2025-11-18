import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { Trophy, DollarSign, Clock, Utensils, AlertTriangle, RotateCcw, Play, Star, Undo, Redo } from 'lucide-react';
import { IngredientType, GameState, INGREDIENTS } from './types';
import { generateRandomOrder, checkOrder, calculateBonus } from './utils/gameLogic';
import { generateFiredNotice, generatePromotionMessage } from './services/geminiService';
import { BurgerRender } from './components/BurgerRender';

// --- Sub-components for UI ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'success' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const baseStyle = "px-6 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    success: "bg-green-600 hover:bg-green-500 text-white"
  };
  
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const IngredientButton: React.FC<{ type: IngredientType; onClick: () => void }> = ({ type, onClick }) => {
  const def = INGREDIENTS[type];
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-lg hover:bg-gray-700 border border-gray-600 transition-colors"
    >
      <div className="w-12 h-12 rounded-full mb-1 border-2 border-gray-500" style={{ backgroundColor: def.color }}></div>
      <span className="text-xs font-bold text-gray-300">{def.name}</span>
    </button>
  );
};

// --- Main App ---

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    screen: 'MENU',
    level: 1,
    score: 0,
    badges: 0,
    currentOrder: [],
    playerStack: [],
    redoStack: [],
    timeLeft: 20,
    feedbackMessage: '',
    highScores: [],
    isThinking: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Game Loop ---

  // Timer Logic
  useEffect(() => {
    if (gameState.screen === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 0) {
             handleGameOver('You ran out of time!');
             return prev;
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.screen]);

  // --- Handlers ---

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      screen: 'PLAYING',
      level: 1,
      score: 0,
      badges: 0,
      timeLeft: 20,
      playerStack: [],
      redoStack: [],
      currentOrder: generateRandomOrder(1),
      feedbackMessage: '',
    }));
  };

  const addIngredient = (type: IngredientType) => {
    if (gameState.screen !== 'PLAYING') return;
    setGameState(prev => ({
      ...prev,
      playerStack: [...prev.playerStack, type],
      redoStack: [] // Clear redo stack when new action occurs
    }));
  };

  const resetStack = () => {
    setGameState(prev => ({ ...prev, playerStack: [], redoStack: [] }));
  };

  const handleUndo = () => {
    if (gameState.playerStack.length === 0) return;
    setGameState(prev => {
      const newStack = [...prev.playerStack];
      const item = newStack.pop();
      if (!item) return prev;
      return {
        ...prev,
        playerStack: newStack,
        redoStack: [item, ...prev.redoStack]
      };
    });
  };

  const handleRedo = () => {
    if (gameState.redoStack.length === 0) return;
    setGameState(prev => {
      const newRedo = [...prev.redoStack];
      const item = newRedo.shift(); // Remove from front of redo stack
      if (!item) return prev;
      return {
        ...prev,
        playerStack: [...prev.playerStack, item],
        redoStack: newRedo
      };
    });
  };

  const submitBurger = async () => {
    if (gameState.screen !== 'PLAYING') return;

    const isCorrect = checkOrder(gameState.playerStack, gameState.currentOrder);

    if (isCorrect) {
      handleLevelSuccess();
    } else {
      handleGameOver("You served the wrong burger!");
    }
  };

  const handleLevelSuccess = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const bonus = calculateBonus(gameState.timeLeft, gameState.level);
    setGameState(prev => ({ ...prev, screen: 'LEVEL_END', isThinking: true }));

    // Call Gemini for praise
    const message = await generatePromotionMessage(gameState.level, bonus);

    setGameState(prev => ({
      ...prev,
      score: prev.score + bonus,
      badges: prev.badges + 1,
      feedbackMessage: message,
      isThinking: false
    }));
  };

  const handleNextLevel = () => {
    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      timeLeft: Math.max(10, 20 - prev.level), // Decrease time slightly as levels go up, floor at 10s
      playerStack: [],
      redoStack: [],
      currentOrder: generateRandomOrder(prev.level + 1),
      screen: 'PLAYING',
      feedbackMessage: ''
    }));
  };

  const handleGameOver = async (reason: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, screen: 'GAME_OVER', isThinking: true }));
    
    // Call Gemini for roast
    const message = await generateFiredNotice(gameState.level, gameState.score, reason);
    
    setGameState(prev => ({
      ...prev,
      feedbackMessage: message,
      isThinking: false,
      highScores: [...prev.highScores, prev.score].sort((a, b) => b - a).slice(0, 5)
    }));
  };

  // --- Renders ---

  return (
    <div className="relative w-full h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      
      {/* 3D Canvas Layer - Always rendered but maybe hidden/paused behind menus if needed, 
          but for smooth transition we keep it. We can conditionally render contents. */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 3, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <ContactShadows opacity={0.4} scale={10} blur={2} far={4} />
            
            {/* Left: Target Order Display */}
            {(gameState.screen === 'PLAYING' || gameState.screen === 'LEVEL_END') && (
              <group position={[-2, 0, 0]} scale={0.8}>
                <BurgerRender ingredients={gameState.currentOrder} isTarget />
              </group>
            )}

            {/* Right: Player Stack */}
            <group position={[gameState.screen === 'MENU' ? 0 : 2, 0, 0]}>
               {/* Show a demo burger in menu */}
               {gameState.screen === 'MENU' 
                  ? <BurgerRender ingredients={[IngredientType.BUN_BOTTOM, IngredientType.PATTY, IngredientType.CHEESE, IngredientType.LETTUCE, IngredientType.TOMATO, IngredientType.BUN_TOP]} isTarget />
                  : <BurgerRender ingredients={gameState.playerStack} />
               }
            </group>

             <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2} />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between p-4">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-gray-800/80 backdrop-blur-md p-3 rounded-xl border border-gray-700 shadow-lg flex flex-col gap-1">
             <h1 className="text-2xl text-yellow-400 game-font tracking-wider">Make Burger 3D</h1>
             {gameState.screen !== 'MENU' && (
               <div className="flex items-center gap-4 text-sm font-mono text-gray-300">
                  <div className="flex items-center gap-1"><Trophy size={16} className="text-yellow-500"/> Lvl {gameState.level}</div>
                  <div className="flex items-center gap-1"><DollarSign size={16} className="text-green-500"/> ${gameState.score}</div>
               </div>
             )}
          </div>
          
          {gameState.screen === 'PLAYING' && (
            <div className={`bg-gray-800/80 backdrop-blur-md px-6 py-2 rounded-xl border ${gameState.timeLeft < 5 ? 'border-red-500 animate-pulse' : 'border-gray-700'} shadow-lg`}>
              <div className={`flex items-center gap-2 text-3xl font-bold ${gameState.timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>
                <Clock /> {gameState.timeLeft}s
              </div>
            </div>
          )}
        </div>

        {/* Center Screen Content */}
        <div className="flex-1 flex items-center justify-center pointer-events-auto">
          
          {/* MENU SCREEN */}
          {gameState.screen === 'MENU' && (
            <div className="bg-gray-900/90 backdrop-blur-lg p-8 rounded-2xl border-2 border-yellow-500 shadow-2xl text-center max-w-md w-full transform transition-all">
              <h2 className="text-5xl mb-6 text-yellow-400 game-font">Chef's Challenge</h2>
              <p className="text-gray-300 mb-8 text-lg">Stack ingredients to match the customer's order. Hurry up, the clock is ticking!</p>
              
              <Button onClick={startGame} className="w-full mb-4 flex items-center justify-center gap-2">
                <Play size={24} /> Start Shift
              </Button>

              {gameState.highScores.length > 0 && (
                <div className="mt-6 bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-xl text-yellow-500 mb-2 game-font">High Scores</h3>
                  <ul>
                    {gameState.highScores.map((s, i) => (
                      <li key={i} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                        <span>Rank {i+1}</span>
                        <span className="font-bold text-green-400">${s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* LEVEL END SCREEN */}
          {gameState.screen === 'LEVEL_END' && (
            <div className="bg-gray-900/90 backdrop-blur-lg p-8 rounded-2xl border-2 border-green-500 shadow-2xl text-center max-w-md animate-bounce-in">
              <h2 className="text-4xl mb-2 text-green-400 game-font">Order Complete!</h2>
              
              <div className="flex justify-center my-4">
                 {/* Badge of chips visualization */}
                 <div className="relative">
                    <Star size={64} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-black text-xs">CHIPS</div>
                 </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-2">Performance Review</h3>
                {gameState.isThinking ? (
                  <div className="animate-pulse text-yellow-500">Manager is writing review...</div>
                ) : (
                  <p className="italic text-lg text-white">"{gameState.feedbackMessage}"</p>
                )}
              </div>

              <Button onClick={handleNextLevel} variant="success" className="w-full flex items-center justify-center gap-2">
                Next Order <Utensils size={20}/>
              </Button>
            </div>
          )}

          {/* GAME OVER SCREEN */}
          {gameState.screen === 'GAME_OVER' && (
            <div className="relative bg-gray-900/95 backdrop-blur-xl p-8 rounded-2xl border-4 border-red-600 shadow-2xl text-center max-w-md overflow-hidden">
              
              {/* Ketchup Splat Overlay */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 z-0">
                 <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#FF0000" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.4,70.8,31.4C59.4,41.4,47.9,48.6,36.4,53.8C25,59,13.6,62.1,0.9,60.6C-11.8,59,-25.3,52.8,-36.9,45.2C-48.5,37.6,-58.2,28.7,-65.9,17.4C-73.6,6.1,-79.3,-7.6,-76.3,-19.8C-73.3,-32,-61.6,-42.7,-49.5,-50.5C-37.4,-58.3,-24.9,-63.2,-11.9,-65.4C1.1,-67.6,14.1,-67.1,30.5,-83.6" transform="translate(100 100) scale(1.1)" />
                 </svg>
              </div>

              <div className="relative z-10">
                <h2 className="text-5xl mb-4 text-red-500 game-font animate-pulse">YOU ARE FIRED!</h2>
                
                <div className="bg-white/10 p-4 rounded-lg mb-6 border border-red-500/50">
                  <div className="flex items-center justify-center gap-2 mb-2 text-red-400">
                    <AlertTriangle />
                    <span className="uppercase font-bold tracking-widest">Termination Notice</span>
                  </div>
                  {gameState.isThinking ? (
                    <div className="animate-pulse text-gray-400">The boss is screaming at you...</div>
                  ) : (
                    <p className="font-mono text-lg text-white">"{gameState.feedbackMessage}"</p>
                  )}
                </div>

                <div className="mb-6">
                   <p className="text-gray-400">Final Salary</p>
                   <p className="text-4xl font-bold text-green-500">${gameState.score}</p>
                </div>

                <Button onClick={() => setGameState(prev => ({...prev, screen: 'MENU'}))} className="w-full">
                   Back to Menu
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls (Only in Playing) */}
        {gameState.screen === 'PLAYING' && (
           <div className="pointer-events-auto w-full max-w-4xl mx-auto mt-4">
              <div className="bg-gray-800/90 backdrop-blur-md rounded-xl p-4 border border-gray-600 shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase text-gray-400 font-bold tracking-widest">Kitchen Counter</span>
                  <div className="flex gap-2">
                    <button 
                        onClick={handleUndo} 
                        disabled={gameState.playerStack.length === 0}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Undo size={14}/> Undo
                    </button>
                    <button 
                        onClick={handleRedo} 
                        disabled={gameState.redoStack.length === 0}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Redo size={14}/> Redo
                    </button>
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    <button onClick={resetStack} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
                      <RotateCcw size={14}/> Reset
                    </button>
                  </div>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {Object.values(INGREDIENTS).map((ing) => (
                    <IngredientButton 
                      key={ing.type} 
                      type={ing.type} 
                      onClick={() => addIngredient(ing.type)} 
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <Button onClick={submitBurger} variant="success" className="w-full md:w-auto md:min-w-[200px]">
                    Order Up!
                  </Button>
                </div>
              </div>
           </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500 pointer-events-auto">
          <p>(C) Noam Gold AI 2025</p>
          <a href="mailto:gold.noam@gmail.com" className="hover:text-blue-400 transition-colors">Send Feedback: gold.noam@gmail.com</a>
        </div>

      </div>
    </div>
  );
}