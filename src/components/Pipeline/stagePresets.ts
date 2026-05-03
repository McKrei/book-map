import { createElement } from 'react';
import {
  FileText,
  Search,
  Sparkles,
  Network,
  Users,
  Mic,
  type LucideIcon,
} from 'lucide-react';
import type { PipelineStage } from './AnalysisPipeline';

function stage(id: string, Icon: LucideIcon, label: string, matches: (m: string) => boolean): PipelineStage {
  return {
    id,
    icon: createElement(Icon, { size: 14 }),
    label,
    matches,
  };
}

export const BOOK_ANALYSIS_STAGES: PipelineStage[] = [
  stage('read', FileText, 'Чтение файла', (m) =>
    /чита|парс|fb2|загруж|reading|parsing/i.test(m),
  ),
  stage('send', Sparkles, 'Отправка книги в Gemini', (m) =>
    /отправ|анализ.*через|анализиру|sending|gemini|ai/i.test(m),
  ),
  stage('analyze', Users, 'Анализ персонажей и сюжета', (m) =>
    /обраба|анализиру|резуль|обнаруж|analyzing/i.test(m),
  ),
  stage('build', Network, 'Построение карты', (m) =>
    /карт|build|map|стро/i.test(m),
  ),
];

export const CASTING_EXTRACTION_STAGES: PipelineStage[] = [
  stage('series', Search, 'Поиск книг той же серии', (m) =>
    /серии|series|priors/i.test(m),
  ),
  stage('send', Sparkles, 'Отправка книги в Gemini', (m) =>
    /отправл|gemini|анализ.*через/i.test(m),
  ),
  stage('extract', Users, 'Извлечение персонажей', (m) =>
    /получено|character|персона/i.test(m),
  ),
  stage('cast', Mic, 'Подбор голосов', (m) =>
    /голос|voice|подбор/i.test(m),
  ),
];
