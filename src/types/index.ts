export interface Book {
  id: string;
  title: string;
  author: string;
  file_url: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  order_index: number;
  title: string;
  summary: string | null;
}

export interface BookCharacter {
  id: string;
  book_id: string;
  name: string;
  description: string;
  first_appearance_chapter: number;
  color: string;
}

export interface PlotEvent {
  id: string;
  book_id: string;
  chapter_id: string;
  order_index: number;
  title: string;
  description: string;
  event_type: 'plot' | 'character_intro' | 'character_change' | 'climax' | 'resolution';
}

export interface CharacterEvent {
  id: string;
  character_id: string;
  event_id: string;
  change_description: string;
  change_type: 'development' | 'death' | 'transformation' | 'revelation' | 'relationship';
}

export interface ParsedFB2 {
  title: string;
  author: string;
  chapters: {
    title: string;
    text: string;
    order: number;
  }[];
}

export interface AIAnalysisResult {
  characters: {
    name: string;
    description: string;
    first_appearance_chapter: number;
    color: string;
  }[];
  chapters: {
    title: string;
    summary: string;
    order: number;
    events: {
      title: string;
      description: string;
      event_type: PlotEvent['event_type'];
      character_changes: {
        character_name: string;
        change_description: string;
        change_type: CharacterEvent['change_type'];
      }[];
    }[];
  }[];
}
