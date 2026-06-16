export interface Recipe {
  id: string;
  title: string;
  category: string;
  description: string;
  prepTime: string;
  portions: string;
  ingredients: string[];
  instructions: string[];
  isPreset?: boolean;
  imageUrl?: string;
  rating?: number;
  ratingsCount?: number;
  isPublic?: boolean;
  userEmail?: string;
  authorId?: string;
  authorName?: string;
}

export const PRESET_RECIPES: Recipe[] = [
  {
    id: "bolo-chocolate",
    title: "Bolo de Chocolate Fofinho com Calda Quente",
    category: "Bolos e Broas",
    description: "Aquele bolo irresistível, fofinho e repleto de cobertura de chocolate cremosa que deixa rastro de afeto por onde passa.",
    prepTime: "45 minutos",
    portions: "12 fatias",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    ratingsCount: 42,
    ingredients: [
      "3 ovos caipiras bem inteiros",
      "1/2 xícara (chá) de óleo de girassol",
      "1 xícara (chá) de açúcar demerara ou refinado",
      "1 xícara (chá) de chocolate em pó ou cacau 50%",
      "2 xícaras (chá) de farinha de trigo peneirada",
      "1 xícara (chá) de água morna",
      "1 colher (sopa) de fermento químico para bolo",
      "Para a cobertura: 1 lata de leite condensado, 1 colher (sopa) de manteiga e 4 colheres (sopa) de chocolate em pó"
    ],
    instructions: [
      "Ligue o seu forno a 180°C para aquecer bem enquanto preparamos a massa.",
      "No liquidificador ou em uma vasilha funda, misture bem os ovos, o óleo e o açúcar por 2 minutos.",
      "Adicione o chocolate em pó e a farinha peneirada, mexendo e juntando a água morna aos poucos até obter uma massa lisa.",
      "Por fim, misture o fermento delicadamente em movimentos circulares de baixo para cima.",
      "Despeje em uma forma redonda de furo central fartamente untada com manteiga e farinha (ou cacau).",
      "Asse por cerca de 35 a 40 minutos. Para a cobertura tradicional, leve os ingredientes ao fogo baixo até ferver e encorpar, cobrindo o bolo ainda morno."
    ],
    isPreset: true
  },
  {
    id: "sopa-abobora",
    title: "Sopa de Abóbora Cremosa com Gengibre",
    category: "Sopas e Caldos",
    description: "Uma sopa aveludada, quentinha e muito temperada para acalentar o estômago e aquecer as noites frias.",
    prepTime: "35 minutos",
    portions: "6 porções",
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    ratingsCount: 29,
    ingredients: [
      "1 kg de abóbora cabotiá picada em cubos sem casca",
      "1 cebola média bem picadinha",
      "2 dentes de alho amassados",
      "1 colher (chá) de gengibre fresco bem ralado",
      "1 colher (sopa) de azeite de oliva",
      "1 litro de caldo caseiro de legumes quente",
      "Cheiro-verde picadinho a gosto",
      "Sal e raminhos de sálvia para decorar"
    ],
    instructions: [
      "Em uma panela funda, aqueça o azeite e doure as cebolas e os dentes de alho com carinho.",
      "Adicione os cubos de abóbora cabotiá e o gengibre ralado, mexendo bem para incorporar o refogado.",
      "Despeje o caldo de legumes caseiro fervente, diminua o fogo, tampe e deixe cozinhar até os cubos ficarem bem macios.",
      "Bata tudo com um mixer de cozinha ou no liquidificador com muito cuidado até formar uma textura rica e uniforme.",
      "Deixe ferver no fogo por mais 5 minutinhos para realçar os perfumes das ervas e o sabor.",
      "Desligue o fogo, despeje o cheiro-verde e sirva bem quente com torradas caseiras polvilhadas!"
    ],
    isPreset: true
  },
  {
    id: "salada-salmao",
    title: "Salada Completa de Salmão e Abacate",
    category: "Almoço de Domingo",
    description: "Um prato vistoso, fresco e colorido ideal para reunir a família sob o sol. Combina folhas verdes, lascas de salmão e ovos cozidos.",
    prepTime: "25 minutos",
    portions: "8 porções",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
    ratingsCount: 56,
    ingredients: [
      "2 filés de salmão fresco grelhados e lascados",
      "1 abacate maduro cortado em fatias elegantes",
      "3 ovos cozidos cortados em quatro partes",
      "1 maço de folhas verdes limpas (alface americana, roxa e rúcula)",
      "1 xícara de tomates-cereja cortados ao meio",
      "1 pepino fatiado bem fininho",
      "Molho especial: suco de 1 limão tahiti, 3 colheres de sopa de azeite extra virgem e uma pitada de gergelim tostado"
    ],
    instructions: [
      "Grelhe os filés de salmão numa frigideira quente com um fio de azeite até dourarem bem de ambos os lados, lascando os filés com um garfo após escolher esfriar.",
      "Cozinhe os ovos por 8 minutos contados em água fervente, descasque sob água fria e corte-os.",
      "Em uma travessa de servir rasa, disponha uma base farta com todas as folhas verdes limpas rasgadas.",
      "Distribua por cima as fatias de abacate cremoso, as rodelas de pepino fresco, os tomatinhos e o salmão defumado ou cozido.",
      "Acomode os pedaços de ovo cozido por cima cuidando para manter o colorido em destaque.",
      "Prepare o molho emulsionando o azeite com o limão e o sal em um potinho, despeje sobre a salada e incremente com gergelim preto."
    ],
    isPreset: true
  },
  {
    id: "cha-capim-limao",
    title: "Chá de Capim-Santo com Limão e Mel",
    category: "Chás e Receitas de Vó",
    description: "Um chá calmante ideal para o final da tarde, excelente para relaxar o corpo e acalentar o coração.",
    prepTime: "15 minutos",
    portions: "4 xícaras",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    ratingsCount: 18,
    ingredients: [
      "1 xícara de folhas frescas de capim-santo (capim-limão) lavadas",
      "1 litro de água filtrada",
      "Suco de meio limão espremido na hora",
      "Mel ou açúcar mascavo a gosto para adoçar"
    ],
    instructions: [
      "Corte as folhas de capim-santo em pedaços menores com uma tesoura para liberar mais aroma.",
      "Em uma caneca ou chaleira grande, ferva o litro de água.",
      "Assim que a água começar a borbulhar, desligue o fogo imediatamente.",
      "Adicione as folhas de capim-santo na água quente, tampe e deixe descansar (infusão) por 10 minutos inteiros.",
      "Coe o chá com uma peneira diretamente nas xícaras.",
      "Adicione umas gotinhas do suco de limão e adoce com uma colher de mel enquanto estiver quentinho para aquecer a alma!"
    ],
    isPreset: true
  },
  {
    id: "arroz-doce",
    title: "Arroz Doce Cremoso com Canela",
    category: "Sobremesas e Doces",
    description: "Aquela sobremesa tradicional de festa junina ou de domingo à tarde, super cremosa e polvilhada com canela aromática.",
    prepTime: "35 minutos",
    portions: "8 taças",
    imageUrl: "https://images.unsplash.com/photo-1533782654613-826a072dd6f3?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    ratingsCount: 37,
    ingredients: [
      "1 xícara (chá) de arroz branco lavadinho",
      "3 xícaras (chá) de água morna",
      "1 lata de leite condensado",
      "1 caixinha de creme de leite para dar cremosidade",
      "2 xícaras (chá) de leite integral",
      "1 canela em rama e 3 cravos-da-índia",
      "Canela em pó para decorar no final"
    ],
    instructions: [
      "Em uma panela de tamanho médio, cozinhe o arroz com a água, a canela em rama e os cravos até que ele fique macio e a água seque quase toda.",
      "Adicione o leite integral e mexa com carinho para o arroz soltar o amido.",
      "Despeje o leite condensado e cozinhe em fogo bem baixinho, mexendo de vez em quando para não grudar no fundo por 10 minutos.",
      "Desligue o fogo e misture a caixinha de creme de leite. Isso deixará o arroz doce incrivelmente aveludado.",
      "Distribua em uma travessa grande ou em potinhos menores.",
      "Polvilhe bastante canela em pó por cima antes de servir. Pode ser consumido quentinho ou gelado!"
    ],
    isPreset: true
  },
  {
    id: "pao-de-queijo",
    title: "Pão de Queijo Mineiro Crocante",
    category: "Chás e Receitas de Vó",
    description: "O verdadeiro pão de queijo com casquinha crocante por fora e textura super macia por dentro. Fica perfeito feito na hora!",
    prepTime: "30 minutos",
    portions: "20 unidades",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    ratingsCount: 51,
    ingredients: [
      "500g de polvilho doce ou azedo de boa qualidade",
      "1 xícara (chá) de leite integral morno",
      "1/2 xícara (chá) de óleo de cozinha limpo",
      "1/2 xícara (chá) de água filtrada morna",
      "2 ovos de galinha caipira grandes",
      "150g de queijo meia cura mineiro ou parmesão ralado",
      "1 colher (chá) de sal bem medido"
    ],
    instructions: [
      "Aqueça em uma panela pequena o leite, a água, o óleo e o sal até levantar fervura completa.",
      "Em uma tigela funda grande, adicione o polvilho doce ou azedo e despeje o líquido fervente com muito cuidado para escaldar.",
      "Mexa bem com uma colher de silicone até que a massa fique morna e em temperatura confortável para amassar.",
      "Adicione os ovos um a um e o parmesão ralado amassando fartamente com as mãos até formar uma textura lisa e que desgrude.",
      "Faça bolinhas redondas e uniformes de tamanho médio e acomode-as em uma fôrma limpa, deixando espaço entre elas.",
      "Asse em forno quente preaquecido a 200°C por cerca de 20 minutos até que fiquem douradinhos e sirva imediatamente com café quentinho!"
    ],
    isPreset: true
  },
  {
    id: "bolinho-chuva",
    title: "Bolinho de Chuva da Vovó Clássico",
    category: "Chás e Receitas de Vó",
    description: "Super macio, sequinho e aromatizado com canela. A receita tradicional que traz de volta as memórias de tardes chuvosas na cozinha da vovó.",
    prepTime: "20 minutos",
    portions: "15 bolinhos",
    imageUrl: "https://images.unsplash.com/photo-1557308536-ee409787b18e?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    ratingsCount: 33,
    ingredients: [
      "2 ovos de granja inteiros batidos",
      "1/2 xícara (chá) de açúcar demerara ou refinado",
      "1 xícara (chá) de leite integral morno",
      "2 e 1/2 xícaras de farinha de trigo peneirada",
      "1 colher (sopa) de fermento químico para bolo",
      "Óleo abundante para fritura em panela funda",
      "Açúcar refinado e canela em pó misturados para empanar no final"
    ],
    instructions: [
      "Em um recipiente fundo grande, misture bem os ovos e o açúcar com um batedor de arame até espumar.",
      "Adicione o leite e vá juntando a farinha peneirada aos poucos, mexendo sem parar até obter uma consistência pastosa encorpada.",
      "Por último, misture o fermento delicadamente em movimentos suaves de baixo para cima.",
      "Aqueça bem uma panela com bastante óleo, mantendo depois o fogo médio para os bolinhos não ficarem crus no miolo.",
      "Com o auxílio de duas colheres de sopa, pingue pequenas porções de massa diretamente no óleo quente.",
      "Frite até que fiquem lindamente dourados de todos os lados, escorra em papel toalha e passe na canela com açúcar."
    ],
    isPreset: true
  },
  {
    id: "lasanha",
    title: "Lasanha de Carne Suprema da Vovó",
    category: "Almoço de Domingo",
    description: "Uma lasanha maravilhosa, montada em camadas generosas de carne moída bem temperada, queijo cremoso derretido e carinho de vó.",
    prepTime: "50 minutos",
    portions: "10 porções",
    imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
    ratingsCount: 64,
    ingredients: [
      "500g de massa de lasanha pré-cozida ou de sua preferência",
      "500g de carne moída de patinho bem limpinha",
      "2 sachês de molho de tomate encorpado e aromático",
      "1 cebola de cabeça grande e 3 dentes de alho picadinhos",
      "400g de queijo mussarela fresco fatiado",
      "300g de presunto cozido fatiado fininho",
      "Queijo parmesão de boa qualidade ralado para gratinar",
      "Sal do Himalaia ou marinho, pimenta-do-reino e folhinhas de manjericão fresco a gosto"
    ],
    instructions: [
      "Em uma panela grande, aqueça um fio de bife de azeite e doure as cebolas e o alho picados com muito amor e carinho.",
      "Junte a carne moída, mexendo até que fique bem douradinha, adicionando o sal, pimenta e os sachês de molho de tomate para cozinhar por 15 minutos.",
      "Separe um refratário retangular grande e espalhe uma camada fina de molho com carne moída no fundo.",
      "Intercale as camadas posicionando massa de lasanha pré-cozida, molho bolonhesa encorpado, fatias de presunto e fatias de mussarela.",
      "Finalize cobrindo com o restante do queijo mussarela e uma generosa dose de queijo parmesão ralado por cima.",
      "Leve ao forno preaquecido a 180°C por cerca de 20 minutos até ferver e o queijo dourar. Adicione manjericão fresco e sirva fumegante!"
    ],
    isPreset: true
  }
];
