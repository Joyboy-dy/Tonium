/**
 * Tonium MCP Server Stub
 * 
 * Ce module définit les schémas et resources exposés par Tonium
 * pour les agents compatibles Model Context Protocol.
 */

export const ToniumMcp = {
  resources: [
    {
      uri: 'tonium://brand/config',
      name: 'Configuration de Marque Tonium',
      description: 'Détails du profil de marque et des préférences visuelles.'
    },
    {
      uri: 'tonium://brand/tokens',
      name: 'Tokens de Design Tonium',
      description: 'Liaison en temps réel vers les variables CSS et tokens sémantiques.'
    }
  ],
  
  tools: [
    {
      name: 'get_contrast',
      description: 'Calcule le contraste WCAG entre deux couleurs.',
      inputSchema: {
        type: 'object',
        properties: {
          color1: { type: 'string' },
          color2: { type: 'string' }
        },
        required: ['color1', 'color2']
      }
    },
    {
      name: 'generate_ramp',
      description: 'Génère une rampe tonale OKLCH complète à partir d\'une couleur.',
      inputSchema: {
        type: 'object',
        properties: {
          baseColor: { type: 'string' }
        },
        required: ['baseColor']
      }
    }
  ],
  
  prompts: [
    {
      name: 'apply_style_guide',
      description: 'Génère des instructions d\'implémentation respectant la DA de la marque.'
    }
  ]
};
