import { BookOpen, BrainCircuit, Calculator, Globe, PenTool, Camera, Music, Palette, Star, Heart, Zap, Shield, Clock, Compass, Sun, Moon, Cloud, Flame, Leaf, Gem, Crown, Rocket, Sparkles, Lightbulb, Feather, Puzzle, Scroll, Telescope, TreePine } from 'lucide-react'

const MODULE_COLORS = [
  '#FEE500', '#FF6B6B', '#4A90D9', '#4CAF50', '#9C27B0',
  '#FF9800', '#E91E63', '#009688', '#3F51B5', '#00BCD4',
  '#FF5722', '#607D8B', '#CDDC39', '#03A9F4', '#795548',
]

const ICON_MAP = {
  BookOpen, BrainCircuit, Calculator, Globe, PenTool,
  Camera, Music, Palette, Star, Heart,
  Zap, Shield, Clock, Compass, Sun,
  Moon, Cloud, Flame, Leaf, Gem,
  Crown, Rocket, Sparkles, Lightbulb, Feather,
  Puzzle, Scroll, Telescope, TreePine,
}

const MODULE_ICONS = Object.keys(ICON_MAP)

export { MODULE_COLORS, MODULE_ICONS, ICON_MAP }

export default function ModuleCustomizeSheet({ color, icon, onColorChange, onIconChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-text-primary">Customize Module</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary hover:bg-border transition-colors text-sm font-medium">
            Done
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-3">Color</p>
          <div className="flex flex-wrap gap-3">
            {MODULE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`w-10 h-10 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-[#111111] scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-secondary mb-3">Icon</p>
          <div className="grid grid-cols-6 gap-2">
            {MODULE_ICONS.map((name) => {
              const Icon = ICON_MAP[name]
              return (
                <button
                  key={name}
                  onClick={() => onIconChange(name)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    icon === name
                      ? 'bg-primary text-[#111111] scale-105'
                      : 'bg-bg-muted text-text-secondary hover:bg-border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}
