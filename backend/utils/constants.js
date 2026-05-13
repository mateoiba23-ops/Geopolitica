// ─── Game Constants ──────────────────────────────────────────────────────────

// ─── Energía ─────────────────────────────────────────────────────────────────
const ENERGY_REGEN_INTERVAL = 10 * 60 * 1000; // 10 minutos en ms
const MAX_ENERGY_BASE        = 100;            // Base sin nada
const ENERGY_PER_LEVEL       = 1;             // +1 por nivel de cuenta
const ENERGY_PER_ENDURANCE   = 3;             // +3 por punto de Aguante
const ENERGY_PREMIUM_BONUS   = 50;            // +50 si es premium
const ENERGY_REGEN_BY_MEDICINE = (med) => med; // medicina 1–10 → +1–10 cada 10 min

// ─── Trabajo ─────────────────────────────────────────────────────────────────
const WORK_ENERGY_COST    = 10; // energía mínima por acción
const WORK_XP_BASE        = 5;  // XP por acción de trabajo normal
const WORK_XP_PREMIUM     = 9;  // XP con premium (+80%)
const WORK_XP_EDUCATION   = 0.5; // XP laboral extra por punto de educación (%)
const GOLD_MINE_RATIO     = 10; // 10 energía = 1 unidad de minería

// ─── Niveles ──────────────────────────────────────────────────────────────────
// Sin límite. Escala progresivamente.
const XP_PER_LEVEL   = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
const WORK_XP_TO_NEXT = (level) => Math.floor(100 * Math.pow(1.4, level - 1));

// Recompensas por nivel
const LEVEL_REWARDS = {
  5:   { gold: 10  },
  10:  { gold: 25  },
  20:  { gold: 50  },
  50:  { gold: 150 },
  100: { gold: 500 },
  200: { gold: 1500 },
  500: { gold: 5000 }
};

// ─── Habilidades ──────────────────────────────────────────────────────────────
// Máximo: 999 por habilidad (sin límite real en backend)
//
// FUERZA (strength)
//   Efecto futuro: daño militar, eficiencia de ataque
//   Efecto actual: +0.5% producción en fábricas por punto (recompensa pasiva)
//
// EDUCACIÓN (education)
//   +2% XP laboral ganada por punto
//   +1.5% bonus de producción en fábricas de oro por punto
//   +1% de eficiencia económica general (salario neto) por punto
//   Aumenta el límite de nivel laboral: workLevelCap = 10 + education * 2
//
// AGUANTE (endurance)
//   +3 energía máxima por punto
//   -0.5% costo energético por punto (máx reducción 40%)
//   +5 slots de almacén personal por punto
//   -1% desgaste en guerras futuras por punto

const SKILLS = {
  strength: {
    name: 'Fuerza',
    icon: '⚔️',
    description: 'Daño militar y eficiencia ofensiva',
    // Por cada punto:
    militaryDamageBonus: 0.005,    // +0.5% daño militar
    productionBonus:     0.002,    // +0.2% producción general (pasiva pequeña)
    trainGoldCost:  (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  },
  education: {
    name: 'Educación',
    icon: '📚',
    description: 'Experiencia laboral, producción y economía',
    // Por cada punto:
    workXpBonus:        0.02,   // +2% XP laboral por acción
    goldFactoryBonus:   0.015,  // +1.5% producción fábricas de oro
    salaryBonus:        0.01,   // +1% salario neto (eficiencia económica)
    workLevelCapBonus:  2,      // +2 al límite de nivel laboral
    trainGoldCost:  (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  },
  endurance: {
    name: 'Aguante',
    icon: '🛡️',
    description: 'Energía máxima, almacén y eficiencia',
    // Por cada punto:
    maxEnergyBonus:      3,     // +3 energía máxima
    energyCostReduction: 0.005, // -0.5% costo energía (máx 40% con 80 pts)
    warehouseBonus:      5,     // +5 slots almacén personal
    warDegradeReduction: 0.01,  // -1% desgaste guerra (futuro)
    trainGoldCost:  (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  }
};

// ─── Fábricas ─────────────────────────────────────────────────────────────────
const FACTORY_TYPES = {
  gold: {
    name: 'Mina de Oro',
    icon: '⚱️',
    baseSalary: 50,
    baseProduction: 10,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    // Minas de oro: doble XP para subir
    xpPerLevel: (level) => Math.floor(2000 * Math.pow(2, level - 1)),
    warehousePerLevel: 100,
    maxWorkersPerLevel: 2,
    color: '#FFD700',
    isGoldMine: true
  },
  oil: {
    name: 'Refinería de Petróleo',
    icon: '🛢️',
    baseSalary: 60,
    baseProduction: 15,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    xpPerLevel: (level) => Math.floor(500 * Math.pow(1.8, level - 1)),
    warehousePerLevel: 150,
    maxWorkersPerLevel: 3,
    color: '#555566',
    isGoldMine: false
  },
  mineral: {
    name: 'Mina Mineral',
    icon: '⛏️',
    baseSalary: 45,
    baseProduction: 12,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    xpPerLevel: (level) => Math.floor(500 * Math.pow(1.8, level - 1)),
    warehousePerLevel: 200,
    maxWorkersPerLevel: 3,
    color: '#8B4513',
    isGoldMine: false
  },
  uranium: {
    name: 'Planta de Uranio',
    icon: '☢️',
    baseSalary: 100,
    baseProduction: 5,
    goldCostPerLevel: (level) => Math.floor(10 * Math.pow(1.2, level - 1)),
    xpPerLevel: (level) => Math.floor(800 * Math.pow(2.0, level - 1)),
    warehousePerLevel: 50,
    maxWorkersPerLevel: 2,
    color: '#39FF14',
    isGoldMine: false
  },
  diamond: {
    name: 'Mina de Diamantes',
    icon: '💎',
    baseSalary: 80,
    baseProduction: 8,
    goldCostPerLevel: (level) => Math.floor(8 * Math.pow(1.18, level - 1)),
    xpPerLevel: (level) => Math.floor(700 * Math.pow(1.9, level - 1)),
    warehousePerLevel: 80,
    maxWorkersPerLevel: 2,
    color: '#B9F2FF',
    isGoldMine: false
  }
};

// ─── Economía global ──────────────────────────────────────────────────────────
const DAILY_GOLD_POOL          = 1000000;
const DISTRIBUTION_HOUR_BOGOTA = 12;
const MARKET_FEE               = 0.05; // 5% comisión mercado

// ─── Costos de creación de fábricas ──────────────────────────────────────────
const FACTORY_CREATION_COST = {
  gold:    { money: 5000,  gold: 20 },
  oil:     { money: 8000,  gold: 25 },
  mineral: { money: 4000,  gold: 15 },
  uranium: { money: 15000, gold: 50 },
  diamond: { money: 10000, gold: 35 }
};

// ─── Helpers de habilidades ───────────────────────────────────────────────────

/**
 * Calcula energía máxima real del jugador.
 */
function calcMaxEnergy(player) {
  const skills    = player.skills || { strength: 1, education: 1, endurance: 1 };
  const endurance = skills.endurance || 1;
  let max = MAX_ENERGY_BASE;
  max += (player.level - 1) * ENERGY_PER_LEVEL;
  max += endurance * ENERGY_PER_ENDURANCE;
  if (player.premium) max += ENERGY_PREMIUM_BONUS;
  return max;
}

/**
 * Calcula límite de almacén personal.
 */
function calcWarehouseLimit(player) {
  const endurance = (player.skills && player.skills.endurance) || 1;
  return 50 + endurance * SKILLS.endurance.warehouseBonus;
}

/**
 * Calcula reducción de energía por Aguante (máx 40%).
 */
function calcEnergyCostReduction(player) {
  const endurance = (player.skills && player.skills.endurance) || 1;
  return Math.min(endurance * SKILLS.endurance.energyCostReduction, 0.40);
}

/**
 * Calcula XP laboral bonus por Educación.
 */
function calcWorkXpBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.workXpBonus; // ej: edu 10 → +20%
}

/**
 * Calcula bonus de producción para fábrica de oro por Educación.
 */
function calcGoldProductionBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.goldFactoryBonus; // ej: edu 10 → +15%
}

/**
 * Calcula bonus de salario neto por Educación.
 */
function calcSalaryBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.salaryBonus; // ej: edu 10 → +10%
}

/**
 * Calcula límite de nivel laboral.
 * workLevelCap = 10 + education * 2
 * Sin educación: tope laboral en nivel 10.
 * Con edu 50: tope en nivel 110.
 */
function calcWorkLevelCap(player) {
  const education = (player.skills && player.skills.education) || 1;
  return 10 + education * SKILLS.education.workLevelCapBonus;
}

/**
 * Procesa subidas de nivel general. Sin límite.
 */
function checkLevelUp(player) {
  const messages = [];
  while (player.xp >= (player.xpToNext || XP_PER_LEVEL(player.level))) {
    player.xp      -= player.xpToNext;
    player.level   += 1;
    player.xpToNext = XP_PER_LEVEL(player.level);
    player.maxEnergy = calcMaxEnergy(player);

    const reward = LEVEL_REWARDS[player.level];
    if (reward) {
      player.gold += reward.gold;
      messages.push(`🎁 Nivel ${player.level}: +${reward.gold} ⚱️`);
    }
    messages.push(`⬆️ ¡Nivel ${player.level} alcanzado!`);
  }
  return messages;
}

/**
 * Procesa subidas de nivel laboral. Limitado por Educación.
 */
function checkWorkLevelUp(player) {
  const messages = [];
  const cap = calcWorkLevelCap(player);

  while (
    player.workXp >= (player.workXpToNext || WORK_XP_TO_NEXT(player.workLevel)) &&
    player.workLevel < cap
  ) {
    player.workXp     -= player.workXpToNext;
    player.workLevel  += 1;
    player.workXpToNext = WORK_XP_TO_NEXT(player.workLevel);
    messages.push(`💼 ¡Nivel laboral ${player.workLevel} alcanzado!`);
  }

  // Mostrar mensaje si está en el tope
  if (player.workLevel >= cap) {
    player.workXp = 0; // No acumular XP laboral inútil
    messages.push(`📚 Nivel laboral máximo (${cap}). Sube Educación para desbloquear más.`);
  }

  return messages;
}

module.exports = {
  // Energía
  ENERGY_REGEN_INTERVAL, MAX_ENERGY_BASE, ENERGY_PER_LEVEL,
  ENERGY_PER_ENDURANCE, ENERGY_PREMIUM_BONUS, ENERGY_REGEN_BY_MEDICINE,
  // Trabajo
  WORK_ENERGY_COST, WORK_XP_BASE, WORK_XP_PREMIUM,
  WORK_XP_EDUCATION, GOLD_MINE_RATIO,
  // Niveles
  XP_PER_LEVEL, WORK_XP_TO_NEXT, LEVEL_REWARDS,
  // Habilidades
  SKILLS,
  // Fábricas
  FACTORY_TYPES, FACTORY_CREATION_COST,
  // Economía
  DAILY_GOLD_POOL, DISTRIBUTION_HOUR_BOGOTA, MARKET_FEE,
  // Helpers
  calcMaxEnergy, calcWarehouseLimit, calcEnergyCostReduction,
  calcWorkXpBonus, calcGoldProductionBonus, calcSalaryBonus,
  calcWorkLevelCap, checkLevelUp, checkWorkLevelUp
};
