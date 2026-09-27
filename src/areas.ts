export const SECTOR_GROUPS: { [group: string]: string[] } = {
  "Produção & Processo": [
    "Biomassa",
    "Caustificação e Forno",
    "Caldeira de Recuperação e Evaporação",
    "Energia",
    "Linha de Fibras",
    "Preparo de Cavaco",
    "Processos Industriais",
    "Recebimento de Madeira",
    "Secagem e Enfardamento"
  ],
  "Manutenção & Oficinas": [
    "Confiabilidade",
    "Confiabilidade e Sistemas Industriais",
    "Manutenção Automação",
    "Manutenção Eletríca",
    "Manutenção Instrumentação",
    "Manutenção Máquinas Móveis",
    "Manutenção Mecânica",
    "Manutenção Oficina",
    "Manutenção Complementar"
  ],
  "Qualidade & Engenharia": [
    "Engenheira de Processos",
    "Engenharia de Projetos",
    "Inovação e Tecnologia",
    "Laboratório Qualidade Industrial",
    "Laboratório Qualidade da Madeira",
    "Planejamento"
  ],
  "Logística & Suprimentos": [
    "Almoxarifado Central",
    "Almoxarifado NAF",
    "Logística de Celulose",
    "Suprimentos",
    "Gestão de Biomassa"
  ],
  "SST & Meio Ambiente": [
    "Segurança do Trabalho",
    "Saúde Ocupacional",
    "SEPRE",
    "Sustentabilidade",
    "Resíduos Sólidos Industriais",
    "Águas",
    "Central Circular",
    "Conservação e Jardinagem"
  ],
  "Administrativo & Apoio": [
    "Administração e Serviços",
    "Ativos Patrimoniais",
    "Centro de Treinamento Industrial",
    "Comunicação",
    "Controladoria",
    "Financeiro",
    "Fiscal",
    "Gerência Geral",
    "Integridade",
    "Jurídico",
    "Restaurante Industrial",
    "Segurança Patrimonial e Limpeza Predial",
    "Serviços Administrativos",
    "Tecnologia da informação",
    "Outra"
  ]
};

export function getSectorGroup(sectorName: string): string {
  for (const [group, list] of Object.entries(SECTOR_GROUPS)) {
    if (list.includes(sectorName)) return group;
  }
  return "Outros";
}

export const AREAS_LIST = [
  "Administração e Serviços",
  "Águas",
  "Almoxarifado Central",
  "Almoxarifado NAF",
  "Ativos Patrimoniais",
  "Biomassa",
  "Caustificação e Forno",
  "Caldeira de Recuperação e Evaporação",
  "Central Circular",
  "Centro de Treinamento Industrial",
  "Comunicação",
  "Confiabilidade",
  "Conservação e Jardinagem",
  "Confiabilidade e Sistemas Industriais",
  "Controladoria",
  "Energia",
  "Engenheira de Processos",
  "Engenharia de Projetos",
  "Financeiro",
  "Fiscal",
  "Gerência Geral",
  "Gestão de Biomassa",
  "Integridade",
  "Inovação e Tecnologia",
  "Jurídico",
  "Laboratório Qualidade Industrial",
  "Laboratório Qualidade da Madeira",
  "Linha de Fibras",
  "Logística de Celulose",
  "Manutenção Automação",
  "Manutenção Eletríca",
  "Manutenção Instrumentação",
  "Manutenção Máquinas Móveis",
  "Manutenção Mecânica",
  "Manutenção Oficina",
  "Manutenção Complementar",
  "Planejamento",
  "Preparo de Cavaco",
  "Processos Industriais",
  "Recebimento de Madeira",
  "Resíduos Sólidos Industriais",
  "Restaurante Industrial",
  "Saúde Ocupacional",
  "Secagem e Enfardamento",
  "Segurança Patrimonial e Limpeza Predial",
  "Segurança do Trabalho",
  "SEPRE",
  "Serviços Administrativos",
  "Suprimentos",
  "Sustentabilidade",
  "Tecnologia da informação",
  "Outra"
];
