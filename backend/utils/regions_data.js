// Colombia - 32 departamentos + Bogotá D.C.
const COLOMBIA_REGIONS = [
  {
    id: 'amazonas', name: 'Amazonas', capital: 'Leticia',
    population: 76243, area: 109665,
    medicine: 2, education: 2, industrial: 1, infrastructure: 1,
    taxes: { income: 10, factory: 8 },
    resources: ['rubber', 'wood', 'fish'],
    production: 45000,
    description: 'Selva amazónica, rica en biodiversidad.'
  },
  {
    id: 'antioquia', name: 'Antioquia', capital: 'Medellín',
    population: 6614630, area: 63612,
    medicine: 7, education: 8, industrial: 8, infrastructure: 7,
    taxes: { income: 15, factory: 12 },
    resources: ['gold', 'coal', 'flowers', 'coffee'],
    production: 4200000,
    description: 'El motor industrial de Colombia.'
  },
  {
    id: 'arauca', name: 'Arauca', capital: 'Arauca',
    population: 294606, area: 23818,
    medicine: 3, education: 3, industrial: 4, infrastructure: 3,
    taxes: { income: 10, factory: 8 },
    resources: ['oil', 'cattle'],
    production: 320000,
    description: 'Frontera con Venezuela, producción petrolera.'
  },
  {
    id: 'atlantico', name: 'Atlántico', capital: 'Barranquilla',
    population: 2434165, area: 3388,
    medicine: 6, education: 6, industrial: 7, infrastructure: 7,
    taxes: { income: 14, factory: 11 },
    resources: ['fish', 'industry'],
    production: 1800000,
    description: 'Puerto del Caribe, centro comercial del norte.'
  },
  {
    id: 'bogota', name: 'Bogotá D.C.', capital: 'Bogotá',
    population: 8380801, area: 1587,
    medicine: 9, education: 10, industrial: 9, infrastructure: 9,
    taxes: { income: 18, factory: 15 },
    resources: ['services', 'finance', 'tech'],
    production: 12000000,
    description: 'Capital de Colombia. Centro económico y político.'
  },
  {
    id: 'bolivar', name: 'Bolívar', capital: 'Cartagena',
    population: 2070110, area: 25978,
    medicine: 5, education: 5, industrial: 6, infrastructure: 6,
    taxes: { income: 13, factory: 10 },
    resources: ['gold', 'fish', 'oil'],
    production: 1400000,
    description: 'Historia, turismo y producción energética.'
  },
  {
    id: 'boyaca', name: 'Boyacá', capital: 'Tunja',
    population: 1217000, area: 23189,
    medicine: 5, education: 6, industrial: 5, infrastructure: 5,
    taxes: { income: 11, factory: 9 },
    resources: ['coal', 'emeralds', 'iron', 'cattle'],
    production: 850000,
    description: 'Esmeraldas y carbón. Corazón de Colombia.'
  },
  {
    id: 'caldas', name: 'Caldas', capital: 'Manizales',
    population: 1061000, area: 7888,
    medicine: 6, education: 7, industrial: 6, infrastructure: 6,
    taxes: { income: 12, factory: 10 },
    resources: ['coffee', 'gold', 'hydropower'],
    production: 750000,
    description: 'Eje cafetero. Alta educación y café de exportación.'
  },
  {
    id: 'caqueta', name: 'Caquetá', capital: 'Florencia',
    population: 401190, area: 88965,
    medicine: 3, education: 3, industrial: 2, infrastructure: 2,
    taxes: { income: 9, factory: 7 },
    resources: ['cattle', 'wood', 'oil'],
    production: 180000,
    description: 'Ganadería y selva. Zona de transición amazónica.'
  },
  {
    id: 'casanare', name: 'Casanare', capital: 'Yopal',
    population: 421000, area: 44640,
    medicine: 4, education: 4, industrial: 5, infrastructure: 4,
    taxes: { income: 11, factory: 9 },
    resources: ['oil', 'cattle', 'gas'],
    production: 620000,
    description: 'Llanos orientales y petróleo abundante.'
  },
  {
    id: 'cauca', name: 'Cauca', capital: 'Popayán',
    population: 1427000, area: 29308,
    medicine: 4, education: 5, industrial: 3, infrastructure: 4,
    taxes: { income: 10, factory: 8 },
    resources: ['gold', 'coffee', 'sugarcane'],
    production: 480000,
    description: 'Diversidad étnica y cultural. Producción agrícola.'
  },
  {
    id: 'cesar', name: 'Cesar', capital: 'Valledupar',
    population: 1100000, area: 22905,
    medicine: 4, education: 4, industrial: 5, infrastructure: 4,
    taxes: { income: 11, factory: 9 },
    resources: ['coal', 'cattle', 'music'],
    production: 680000,
    description: 'Vallenato y carbón. Sur del Caribe.'
  },
  {
    id: 'choco', name: 'Chocó', capital: 'Quibdó',
    population: 540000, area: 46530,
    medicine: 2, education: 2, industrial: 2, infrastructure: 1,
    taxes: { income: 8, factory: 6 },
    resources: ['platinum', 'gold', 'wood', 'fish'],
    production: 120000,
    description: 'Mayor biodiversidad. Platino y minería artesanal.'
  },
  {
    id: 'cordoba', name: 'Córdoba', capital: 'Montería',
    population: 1800000, area: 25020,
    medicine: 4, education: 4, industrial: 4, infrastructure: 4,
    taxes: { income: 11, factory: 9 },
    resources: ['cattle', 'gold', 'fish', 'nickel'],
    production: 750000,
    description: 'Ganadería y níquel. Costa norte.'
  },
  {
    id: 'cundinamarca', name: 'Cundinamarca', capital: 'Bogotá',
    population: 2920000, area: 24210,
    medicine: 7, education: 7, industrial: 7, infrastructure: 8,
    taxes: { income: 15, factory: 12 },
    resources: ['flowers', 'coal', 'industry', 'gold'],
    production: 2100000,
    description: 'Rodea la capital. Alto desarrollo industrial y agro.'
  },
  {
    id: 'guainia', name: 'Guainía', capital: 'Inírida',
    population: 48000, area: 72238,
    medicine: 2, education: 2, industrial: 1, infrastructure: 1,
    taxes: { income: 7, factory: 5 },
    resources: ['gold', 'wood', 'fish'],
    production: 18000,
    description: 'Frontera remota con Venezuela y Brasil.'
  },
  {
    id: 'guaviare', name: 'Guaviare', capital: 'San José del Guaviare',
    population: 112000, area: 53460,
    medicine: 2, education: 2, industrial: 1, infrastructure: 1,
    taxes: { income: 8, factory: 6 },
    resources: ['wood', 'rubber', 'fish'],
    production: 32000,
    description: 'Puerta a la Amazonía. Ecoturismo emergente.'
  },
  {
    id: 'huila', name: 'Huila', capital: 'Neiva',
    population: 1200000, area: 19890,
    medicine: 5, education: 5, industrial: 5, infrastructure: 5,
    taxes: { income: 12, factory: 10 },
    resources: ['oil', 'coffee', 'gold'],
    production: 680000,
    description: 'Café especial y petróleo. Valle del Magdalena.'
  },
  {
    id: 'laguajira', name: 'La Guajira', capital: 'Riohacha',
    population: 957000, area: 20848,
    medicine: 3, education: 3, industrial: 4, infrastructure: 3,
    taxes: { income: 10, factory: 8 },
    resources: ['coal', 'salt', 'gas', 'wind'],
    production: 540000,
    description: 'Carbón, gas y energía eólica. Desierto en el Caribe.'
  },
  {
    id: 'magdalena', name: 'Magdalena', capital: 'Santa Marta',
    population: 1360000, area: 23188,
    medicine: 4, education: 5, industrial: 5, infrastructure: 5,
    taxes: { income: 12, factory: 9 },
    resources: ['banana', 'fish', 'tourism', 'coal'],
    production: 720000,
    description: 'Banano, turismo y Sierra Nevada.'
  },
  {
    id: 'meta', name: 'Meta', capital: 'Villavicencio',
    population: 1000000, area: 85635,
    medicine: 5, education: 5, industrial: 5, infrastructure: 5,
    taxes: { income: 12, factory: 10 },
    resources: ['oil', 'cattle', 'rice'],
    production: 840000,
    description: 'Llanos, petróleo y agroindustria en expansión.'
  },
  {
    id: 'narino', name: 'Nariño', capital: 'Pasto',
    population: 1700000, area: 33268,
    medicine: 5, education: 5, industrial: 4, infrastructure: 4,
    taxes: { income: 11, factory: 9 },
    resources: ['gold', 'coffee', 'fish'],
    production: 560000,
    description: 'Frontera con Ecuador. Artesanías y biodiversidad.'
  },
  {
    id: 'norte_santander', name: 'Norte de Santander', capital: 'Cúcuta',
    population: 1600000, area: 21658,
    medicine: 5, education: 5, industrial: 6, infrastructure: 5,
    taxes: { income: 13, factory: 10 },
    resources: ['coal', 'oil', 'cattle'],
    production: 980000,
    description: 'Frontera comercial con Venezuela. Carbón térmico.'
  },
  {
    id: 'putumayo', name: 'Putumayo', capital: 'Mocoa',
    population: 360000, area: 24885,
    medicine: 3, education: 3, industrial: 3, infrastructure: 2,
    taxes: { income: 9, factory: 7 },
    resources: ['oil', 'wood', 'rubber'],
    production: 220000,
    description: 'Petróleo amazónico. Frontera con Ecuador.'
  },
  {
    id: 'quindio', name: 'Quindío', capital: 'Armenia',
    population: 576000, area: 1845,
    medicine: 6, education: 7, industrial: 5, infrastructure: 6,
    taxes: { income: 12, factory: 10 },
    resources: ['coffee', 'tourism', 'flowers'],
    production: 420000,
    description: 'Corazón del eje cafetero. Turismo rural en auge.'
  },
  {
    id: 'risaralda', name: 'Risaralda', capital: 'Pereira',
    population: 967000, area: 4140,
    medicine: 6, education: 7, industrial: 6, infrastructure: 6,
    taxes: { income: 13, factory: 10 },
    resources: ['coffee', 'gold', 'flowers'],
    production: 680000,
    description: 'Café, comercio y desarrollo del eje cafetero.'
  },
  {
    id: 'san_andres', name: 'San Andrés y Providencia', capital: 'San Andrés',
    population: 79000, area: 52,
    medicine: 7, education: 7, industrial: 3, infrastructure: 6,
    taxes: { income: 5, factory: 4 },
    resources: ['tourism', 'fish'],
    production: 180000,
    description: 'Isla caribeña. Zona libre de comercio y turismo.'
  },
  {
    id: 'santander', name: 'Santander', capital: 'Bucaramanga',
    population: 2100000, area: 30537,
    medicine: 7, education: 7, industrial: 7, infrastructure: 7,
    taxes: { income: 14, factory: 11 },
    resources: ['oil', 'gold', 'industry', 'cattle'],
    production: 1600000,
    description: 'Industria petrolera y manufactura. Gran desarrollo.'
  },
  {
    id: 'sucre', name: 'Sucre', capital: 'Sincelejo',
    population: 900000, area: 10917,
    medicine: 4, education: 4, industrial: 3, infrastructure: 4,
    taxes: { income: 10, factory: 8 },
    resources: ['cattle', 'fish', 'gold'],
    production: 380000,
    description: 'Ganadería y pesca en el Caribe colombiano.'
  },
  {
    id: 'tolima', name: 'Tolima', capital: 'Ibagué',
    population: 1330000, area: 23562,
    medicine: 5, education: 5, industrial: 5, infrastructure: 5,
    taxes: { income: 12, factory: 9 },
    resources: ['coffee', 'rice', 'gold', 'cotton'],
    production: 720000,
    description: 'Ciudad musical. Agricultura diversificada.'
  },
  {
    id: 'valle_cauca', name: 'Valle del Cauca', capital: 'Cali',
    population: 4520000, area: 22140,
    medicine: 8, education: 8, industrial: 8, infrastructure: 8,
    taxes: { income: 16, factory: 13 },
    resources: ['sugarcane', 'industry', 'gold', 'fish'],
    production: 4800000,
    description: 'Motor del suroccidente. Industria azucarera y más.'
  },
  {
    id: 'vaupes', name: 'Vaupés', capital: 'Mitú',
    population: 44000, area: 65268,
    medicine: 2, education: 2, industrial: 1, infrastructure: 1,
    taxes: { income: 7, factory: 5 },
    resources: ['gold', 'wood', 'fish'],
    production: 12000,
    description: 'Frontera amazónica. Comunidades indígenas.'
  },
  {
    id: 'vichada', name: 'Vichada', capital: 'Puerto Carreño',
    population: 105000, area: 100242,
    medicine: 2, education: 2, industrial: 1, infrastructure: 1,
    taxes: { income: 8, factory: 6 },
    resources: ['cattle', 'fish', 'wood'],
    production: 28000,
    description: 'Llanos inmensos. Frontera con Venezuela.'
  }
];

module.exports = { COLOMBIA_REGIONS };
