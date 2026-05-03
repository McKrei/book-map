# Каталог голосов Gemini 3.1 Flash TTS Preview

30 prebuilt-голосов, доступных в `gemini-3.1-flash-tts-preview`. Имена — астрономические объекты. Поддерживаются 70+ языков, включая русский. Передаются в API через `prebuiltVoiceConfig.voiceName`.

| ID | Пол | Стиль | Высота | Описание |
|---|---|---|---|---|
| Zephyr | F | Bright | Higher | Bright and clear female voice |
| Puck | M | Upbeat | Middle | Upbeat and lively male voice |
| Charon | M | Informative | Lower | Calm and professional male voice |
| Kore | F | Firm | Middle | Strong and firm female voice |
| Fenrir | M | Excitable | Lower middle | Passionate and energetic male voice |
| Leda | F | Youthful | Higher | Youthful and energetic female voice |
| Orus | M | Firm | Lower middle | Calm and firm male voice |
| Aoede | F | Breezy | Middle | Relaxed and natural female voice |
| Callirrhoe | F | Easy-going | Middle | Friendly and easy-going female voice |
| Autonoe | F | Bright | Middle | Bright and cheerful female voice |
| Enceladus | M | Breathy | Lower | Soft and breathy male voice |
| Iapetus | M | Clear | Lower middle | Clear and clean male voice |
| Umbriel | M | Easy-going | Lower middle | Relaxed and easy-going male voice |
| Algieba | M | Smooth | Lower | Smooth and flowing male voice |
| Despina | F | Smooth | Middle | Smooth and gentle female voice |
| Erinome | F | Clear | Middle | Clear and articulate female voice |
| Algenib | M | Gravelly | Lower | Gravelly and textured male voice |
| Rasalgethi | M | Informative | Middle | Professional narrator male voice |
| Laomedeia | F | Upbeat | Higher | Positive and upbeat female voice |
| Achernar | F | Soft | Higher | Soft and warm female voice |
| Alnilam | M | Firm | Lower middle | Confident and firm male voice |
| Schedar | M | Even | Lower middle | Even and steady male voice |
| Gacrux | F | Mature | Middle | Mature and steady female voice |
| Pulcherrima | M | Forward | Middle | Forward and enterprising male voice |
| Achird | M | Friendly | Lower middle | Friendly and kind male voice |
| Zubenelgenubi | M | Casual | Lower middle | Casual and relaxed male voice |
| Vindemiatrix | F | Gentle | Middle | Gentle and delicate female voice |
| Sadachbia | M | Lively | Lower | Lively and vivid male voice |
| Sadaltager | M | Knowledgeable | Middle | Knowledgeable and learned male voice |
| Sulafat | F | Warm | Middle | Warm and approachable female voice |

Итого: 18 male, 12 female.

## Дефолты для типичных персонажей

| Роль | Рекомендуемый голос | Альтернатива |
|---|---|---|
| Рассказчик (мужской) | Charon | Rasalgethi, Iapetus |
| Рассказчик (женский) | Sulafat | Vindemiatrix, Despina |
| Главный герой (молодой) | Puck (M) / Leda (F) | Fenrir / Laomedeia |
| Антагонист (зрелый) | Algenib | Algieba |
| Старик / мудрец | Sadaltager | Schedar |
| Ребёнок | Leda | Laomedeia |
| Военный / лидер | Alnilam | Kore |
| Учёный | Charon | Erinome |
| Воин / варвар | Fenrir | Sadachbia |

## Audio tags (управление стилем)

Поддерживается **200+ тегов**. Передаются прямо в текст в квадратных скобках, на любом языке.

Примеры на русском (проверены):
- Эмоции: `[злобно]`, `[радостно]`, `[грустно]`, `[испуганно]`, `[саркастично]`, `[удивлённо]`
- Темп: `[быстро]`, `[медленно]`, `[нараспев]`
- Громкость: `[шёпотом]`, `[громко]`, `[кричит]`
- Невербальные: `[laughs]`, `[sigh]`, `[пауза]`, `[вздох]`
- Стиль: `[как актёр шекспировского театра]`, `[как диктор новостей]`

## Стиль через system-промпт

Дополнительно к тегам можно передать вводный текст-инструкцию перед самим текстом-репликой. Например:

```
Скажи спокойно и выразительно, как рассказчик аудиокниги:
Уже стемнело, когда Пётр Иванович вышел на улицу...
```

Эта инструкция учитывается моделью и не озвучивается.

## Источники

- Google AI for Developers — [Speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- Google Blog — [Gemini 3.1 Flash TTS](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-tts/)
- Voice Library reference — [gemini-tts.com/voices](https://gemini-tts.com/voices)
