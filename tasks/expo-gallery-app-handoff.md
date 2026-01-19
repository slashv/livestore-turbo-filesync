# Handoff: Implement Expo Gallery App

## Context

We have created `@livestore-filesync/expo` package that provides Expo/React Native adapters for the livestore-filesync system. The package is located at `libs/livestore-filesync/packages/expo/` on branch `feat/expo-filesystem-image-processor`.

The web and electron gallery apps already work. Now we need to implement the mobile (Expo) version using the new expo adapters.

## What Was Built

### Package: `@livestore-filesync/expo`

Three main components:

1. **ExpoFileSystem** (`ExpoFileSystem.ts`)
   - Effect Platform FileSystem implementation using `expo-file-system`
   - Uses `Paths.document` as default base directory
   - Exports: `layer()`, `layerDefault`, `makeExpoFileSystem()`

2. **ExpoImageProcessor** (`ExpoImageProcessor.ts`)
   - URI-based image processor using `expo-image-manipulator`
   - Implements `UriImageProcessor` interface
   - WebP only on Android, falls back to JPEG on iOS
   - Exports: `createExpoImageProcessor()`

3. **ExpoFile** (`ExpoFile.ts`)
   - File-like wrapper for URI-based files
   - Implements Web `Blob` interface for compatibility with `FilePreprocessor`
   - Exports: `ExpoFile` class with `fromUri()` and `fromBytes()` static methods

## Your Task

Create an Expo app in `apps/expo/` that replicates the gallery functionality from `apps/web/` and `apps/electron/`.

### Key Implementation Points

#### 1. Initialize FileSync with Expo Adapters

```typescript
import { initFileSync } from '@livestore-filesync/core'
import { layer as expoFileSystemLayer } from '@livestore-filesync/expo'

initFileSync(store, {
  fileSystem: expoFileSystemLayer(),
  remote: { signerBaseUrl: 'YOUR_API_URL' }
})
```

#### 2. Image Processing Approach

The existing web/electron apps use `BufferImageProcessor` (vips/canvas). For Expo, you have two options:

**Option A: Use ExpoImageProcessor directly** (recommended for thumbnails)
```typescript
import { createExpoImageProcessor } from '@livestore-filesync/expo'

const processor = createExpoImageProcessor()
await processor.init()

const thumbnail = await processor.process(imageUri, {
  maxDimension: 200,
  format: 'jpeg',
  quality: 80
})
```

**Option B: Create a FilePreprocessor using ExpoFile**
```typescript
import { ExpoFile, createExpoImageProcessor } from '@livestore-filesync/expo'

const processor = createExpoImageProcessor()

const expoImagePreprocessor = async (file: File): Promise<File> => {
  // If it's an ExpoFile, we can use its URI directly
  if (file instanceof ExpoFile) {
    const result = await processor.process(file.uri, {
      maxDimension: 1500,
      format: 'jpeg',
      quality: 85
    })
    return ExpoFile.fromUri(result.uri, { type: result.mimeType })
  }
  // Otherwise, write to temp and process
  // ... handle regular File objects
}
```

#### 3. Image Picker Integration

Use `expo-image-picker` to let users select images:

```typescript
import * as ImagePicker from 'expo-image-picker'
import { ExpoFile } from '@livestore-filesync/expo'
import { saveFile } from '@livestore-filesync/core'

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  })

  if (!result.canceled) {
    const asset = result.assets[0]
    const file = ExpoFile.fromUri(asset.uri, {
      type: asset.mimeType,
      name: asset.fileName
    })
    await saveFile(file)
  }
}
```

#### 4. Displaying Images

Use `expo-image` for efficient image display with caching:

```typescript
import { Image } from 'expo-image'
import { resolveFileUrl } from '@livestore-filesync/core'

// Get URL for a file
const url = await resolveFileUrl(fileId)

// Display with expo-image
<Image
  source={{ uri: url }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>
```

### Reference: Existing Gallery Apps

Study these for the overall architecture:
- `apps/web/` - Web gallery implementation
- `apps/electron/` - Electron gallery (shares most code with web)

Key files to reference:
- Schema/store setup
- Gallery component structure
- How `resolveFileUrl()` is used
- How image upload flow works

### Required Expo Packages

```bash
npx expo install expo-file-system expo-image-manipulator expo-image expo-image-picker
```

### Considerations

1. **LiveStore Adapter**: You'll need `@livestore/adapter-expo` or similar. Check if it exists, otherwise you may need to use the web adapter with appropriate polyfills.

2. **Sync Server**: The gallery needs a backend for sync. Reuse the existing sync infrastructure from the web app.

3. **Image Thumbnails**: Consider generating thumbnails on save using `ExpoImageProcessor.processMultiple()` to create multiple sizes efficiently.

4. **Offline Support**: The local-first architecture should work out of the box - files are saved locally first, then synced when online.

5. **WebP Limitation**: Remember WebP encoding only works on Android. Consider using JPEG as the default format for cross-platform consistency.

### Testing

1. Test image selection from gallery
2. Test image capture from camera
3. Test offline functionality (save images while offline, sync when back online)
4. Test sync between devices (web + mobile)
5. Verify thumbnails generate correctly on both iOS and Android

## Files to Create

```
apps/expo/
├── app.json
├── package.json
├── tsconfig.json
├── App.tsx
├── src/
│   ├── components/
│   │   ├── Gallery.tsx
│   │   └── ImageCard.tsx
│   ├── livestore/
│   │   ├── schema.ts
│   │   └── store.ts
│   └── hooks/
│       └── useFileSync.ts
```

## Success Criteria

1. App displays synced images from the gallery
2. Users can add images from camera roll or camera
3. Images sync with other clients (web/electron)
4. Works offline with automatic sync when online
5. Thumbnails are generated for efficient display
