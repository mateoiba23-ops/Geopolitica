// ─── Game Constants ──────────────────────────────────────────────────────────

// ─── Energía ─────────────────────────────────────────────────────────────────
const ENERGY_REGEN_INTERVAL  = 60 * 1000;  // Cada 1 MINUTO
const MAX_ENERGY_BASE        = 100;
const ENERGY_PER_LEVEL       = 1;          // +1 por nivel de cuenta
const ENERGY_PER_ENDURANCE   = 3;          // +3 por punto de Aguante
const ENERGY_PREMIUM_BONUS   = 50;         // +50 si es premium

// medicina 1–10 → regen por minuto
// medicina 1 = +0.1/min (1 cada 10 min) ... medicina 10 = +1/min (10 cada 10 min)
// Se acumula y solo sube cuando llega a número entero
const ENERGY_REGEN_PER_MIN = (medicine) => medicine / 10;

// ─── Trabajo ─────────────────────────────────────────────────────────────────
const WORK_ENERGY_COST    = 10;
const WORK_XP_BASE        = 5;   // XP general por acción normal
const WORK_XP_PREMIUM     = 9;   // XP general con premium

// XP de HABILIDADES por trabajo — lento, de persistencia
// Por cada acción de trabajo (10 energía) se gana:
const WORK_SKILL_XP = {
  education: 0.8,   // 0.8 XP de Educación por acción  (~125 acciones por nivel 1→2)
  endurance: 0.5    // 0.5 XP de Aguante por acción     (~200 acciones por nivel 1→2)
};

const GOLD_MINE_RATIO = 10; // 10 energía = 1 unidad de minería

// ─── XP de habilidades por guerra (cuando se implemente) ─────────────────────
const WAR_SKILL_XP = {
  strength: 2.0,   // 2 XP de Fuerza por ronda de combate
  endurance: 1.0   // 1 XP de Aguante por ronda de combate
};

// ─── Sistema de XP de habilidades ────────────────────────────────────────────
// Cuánta XP necesita cada nivel de habilidad
// Progresión lenta y de persistencia:
// Nivel 1→2: 100 XP  (normal)
// Nivel 2→3: 200 XP
// Nivel 10→11: 1000 XP
// Nivel 50→51: 5000 XP
// Nivel 99→100: 9900 XP
const SKILL_XP_TO_NEXT = (level) => level * 100;

// ─── Niveles de cuenta ────────────────────────────────────────────────────────
const XP_PER_LEVEL    = (level) => Math.floor(100 * Math.pow(1.5, level - 1));
const WORK_XP_TO_NEXT = (level) => Math.floor(100 * Math.pow(1.4, level - 1));

const LEVEL_REWARDS = {
  5:   { gold: 10   },
  10:  { gold: 25   },
  20:  { gold: 50   },
  50:  { gold: 150  },
  100: { gold: 500  },
  200: { gold: 1500 },
  500: { gold: 5000 }
};

// ─── Habilidades ──────────────────────────────────────────────────────────────
const SKILLS = {
  strength: {
    name: 'Fuerza',
    icon: '⚔️',
    description: 'Daño militar y eficiencia ofensiva',
    militaryDamageBonus: 0.005,  // +0.5% daño por punto
    productionBonus:     0.002,  // +0.2% producción general
    // XP ganada por: guerras principalmente
    xpSources: ['war'],
    trainGoldCost:   (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  },
  education: {
    name: 'Educación',
    icon: '📚',
    description: 'Experiencia laboral, producción y economía',
    workXpBonus:       0.02,   // +2% XP laboral por acción
    goldFactoryBonus:  0.015,  // +1.5% producción minas de oro
    salaryBonus:       0.01,   // +1% salario neto
    workLevelCapBonus: 2,      // +2 tope nivel laboral
    // XP ganada por: trabajar
    xpSources: ['work'],
    trainGoldCost:   (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  },
  endurance: {
    name: 'Aguante',
    icon: '🛡️',
    description: 'Energía máxima, almacén y eficiencia',
    maxEnergyBonus:      3,     // +3 energía máxima por punto
    energyCostReduction: 0.005, // -0.5% costo energía (máx 40%)
    warehouseBonus:      5,     // +5 slots almacén personal
    warDegradeReduction: 0.01,  // -1% desgaste guerra
    // XP ganada por: trabajar y guerras
    xpSources: ['work', 'war'],
    trainGoldCost:   (level) => Math.max(1, Math.floor(level * 1.5)),
    trainEnergyCost: 20
  }
};

// ─── Fábricas ─────────────────────────────────────────────────────────────────
const FACTORY_TYPES = {
  gold: {
    name: 'Mina de Oro', icon: '⚱️',
    baseSalary: 50, baseProduction: 10,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    xpPerLevel: (level) => Math.floor(2000 * Math.pow(2, level - 1)),
    warehousePerLevel: 100, maxWorkersPerLevel: 2,
    color: '#FFD700', isGoldMine: true
  },
  oil: {
    name: 'Refinería de Petróleo', icon: '🛢️',
    baseSalary: 60, baseProduction: 15,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    xpPerLevel: (level) => Math.floor(500 * Math.pow(1.8, level - 1)),
    warehousePerLevel: 150, maxWorkersPerLevel: 3,
    color: '#555566', isGoldMine: false
  },
  mineral: {
    name: 'Mina Mineral', icon: '⛏️',
    baseSalary: 45, baseProduction: 12,
    goldCostPerLevel: (level) => Math.floor(5 * Math.pow(1.15, level - 1)),
    xpPerLevel: (level) => Math.floor(500 * Math.pow(1.8, level - 1)),
    warehousePerLevel: 200, maxWorkersPerLevel: 3,
    color: '#8B4513', isGoldMine: false
  },
  uranium: {
    name: 'Planta de Uranio', icon: '☢️',
    baseSalary: 100, baseProduction: 5,
    goldCostPerLevel: (level) => Math.floor(10 * Math.pow(1.2, level - 1)),
    xpPerLevel: (level) => Math.floor(800 * Math.pow(2.0, level - 1)),
    warehousePerLevel: 50, maxWorkersPerLevel: 2,
    color: '#39FF14', isGoldMine: false
  },
  diamond: {
    name: 'Mina de Diamantes', icon: '💎',
    baseSalary: 80, baseProduction: 8,
    goldCostPerLevel: (level) => Math.floor(8 * Math.pow(1.18, level - 1)),
    xpPerLevel: (level) => Math.floor(700 * Math.pow(1.9, level - 1)),
    warehousePerLevel: 80, maxWorkersPerLevel: 2,
    color: '#B9F2FF', isGoldMine: false
  }
};

const FACTORY_CREATION_COST = {
  gold:    { money: 5000,  gold: 20 },
  oil:     { money: 8000,  gold: 25 },
  mineral: { money: 4000,  gold: 15 },
  uranium: { money: 15000, gold: 50 },
  diamond: { money: 10000, gold: 35 }
};

// ─── Economía ─────────────────────────────────────────────────────────────────
const DAILY_GOLD_POOL          = 1000000;
const DISTRIBUTION_HOUR_BOGOTA = 12;
const MARKET_FEE               = 0.05;

// ─── Helpers de energía ───────────────────────────────────────────────────────
function calcMaxEnergy(player) {
  const endurance = (player.skills && player.skills.endurance) || 1;
  let max = MAX_ENERGY_BASE;
  max += (player.level - 1) * ENERGY_PER_LEVEL;
  max += endurance * ENERGY_PER_ENDURANCE;
  if (player.premium) max += ENERGY_PREMIUM_BONUS;
  return max;
}

function calcWarehouseLimit(player) {
  const endurance = (player.skills && player.skills.endurance) || 1;
  return 50 + endurance * SKILLS.endurance.warehouseBonus;
}

function calcEnergyCostReduction(player) {
  const endurance = (player.skills && player.skills.endurance) || 1;
  return Math.min(endurance * SKILLS.endurance.energyCostReduction, 0.40);
}

function calcWorkXpBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.workXpBonus;
}

function calcGoldProductionBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.goldFactoryBonus;
}

function calcSalaryBonus(player) {
  const education = (player.skills && player.skills.education) || 1;
  return education * SKILLS.education.salaryBonus;
}

function calcWorkLevelCap(player) {
  const education = (player.skills && player.skills.education) || 1;
  return 10 + education * SKILLS.education.workLevelCapBonus;
}

// ─── Sistema de XP de habilidades ────────────────────────────────────────────

/**
 * Añade XP a una habilidad y procesa subidas de nivel.
 * Modifica player.skillXp y player.skills en su lugar.
 * Retorna array de mensajes de level-up.
 */
function addSkillXp(player, skill, amount) {
  if (!SKILLS[skill]) return [];
  if (!player.skillXp) player.skillXp = {};
  if (!player.skillXp[skill]) player.skillXp[skill] = 0;

  player.skillXp[skill] += amount;
  const messages = [];

  // Procesar subidas de nivel
  const currentLevel = player.skills[skill] || 1;
  let needed = SKILL_XP_TO_NEXT(currentLevel);

  while (player.skillXp[skill] >= needed) {
    player.skillXp[skill] -= needed;
    player.skills[skill]   = (player.skills[skill] || 1) + 1;

    const newLevel = player.skills[skill];
    messages.push(`${SKILLS[skill].icon} ${SKILLS[skill].name} subió al nivel ${newLevel}!`);

    // Recalcular derivados si sube Aguante
    if (skill === 'endurance') {
      player.maxEnergy      = calcMaxEnergy(player);
      player.warehouseLimit = calcWarehouseLimit(player);
    }

    needed = SKILL_XP_TO_NEXT(newLevel);
  }

  return messages;
}

/**
 * Calcula cuánta XP de habilidad gana al trabajar workUnits acciones.
 */
function calcWorkSkillXpGain(workUnits) {
  return {
    education: workUnits * WORK_SKILL_XP.education,
    endurance: workUnits * WORK_SKILL_XP.endurance
  };
}

/**
 * Calcula cuánta XP de habilidad gana en combate (para guerras).
 */
function calcWarSkillXpGain(rounds) {
  return {
    strength: rounds * WAR_SKILL_XP.strength,
    endurance: rounds * WAR_SKILL_XP.endurance
  };
}

// ─── Niveles generales ────────────────────────────────────────────────────────

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

function checkWorkLevelUp(player) {
  const messages = [];
  const cap = calcWorkLevelCap(player);
  while (
    player.workXp >= (player.workXpToNext || WORK_XP_TO_NEXT(player.workLevel)) &&
    player.workLevel < cap
  ) {
    player.workXp    -= player.workXpToNext;
    player.workLevel += 1;
    player.workXpToNext = WORK_XP_TO_NEXT(player.workLevel);
    messages.push(`💼 ¡Nivel laboral ${player.workLevel} alcanzado!`);
  }
  if (player.workLevel >= cap) player.workXp = 0;
  return messages;
}

module.exports = {
  // Intervalos
  ENERGY_REGEN_INTERVAL,
  // Energía
  MAX_ENERGY_BASE, ENERGY_PER_LEVEL, ENERGY_PER_ENDURANCE,
  ENERGY_PREMIUM_BONUS, ENERGY_REGEN_PER_MIN,
  // Trabajo
  WORK_ENERGY_COST, WORK_XP_BASE, WORK_XP_PREMIUM,
  WORK_SKILL_XP, WAR_SKILL_XP, GOLD_MINE_RATIO,
  // Habilidades
  SKILLS, SKILL_XP_TO_NEXT,
  // Niveles
  XP_PER_LEVEL, WORK_XP_TO_NEXT, LEVEL_REWARDS,
  // Fábricas
  FACTORY_TYPES, FACTORY_CREATION_COST,
  // Economía
  DAILY_GOLD_POOL, DISTRIBUTION_HOUR_BOGOTA, MARKET_FEE,
  // Helpers
  calcMaxEnergy, calcWarehouseLimit, calcEnergyCostReduction,
  calcWorkXpBonus, calcGoldProductionBonus, calcSalaryBonus,
  calcWorkLevelCap, checkLevelUp, checkWorkLevelUp,
  // Skill XP
  addSkillXp, calcWorkSkillXpGain, calcWarSkillXpGain
};
