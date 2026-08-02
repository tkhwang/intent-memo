import { LazyStore } from "@tauri-apps/plugin-store";
import { z } from "zod";
import type { LayoutSettings } from "@/types/library";

const store = new LazyStore("settings.json");

const settingsSchema = z.object({
  libraryRoot: z.string().min(1).nullable(),
  folderPaneOpen: z.boolean(),
  listPaneOpen: z.boolean(),
});

const defaultSettings: LayoutSettings = {
  libraryRoot: null,
  folderPaneOpen: true,
  listPaneOpen: true,
};

export async function loadSettings(): Promise<LayoutSettings> {
  const [libraryRoot, folderPaneOpen, listPaneOpen] = await Promise.all([
    store.get<unknown>("libraryRoot"),
    store.get<unknown>("folderPaneOpen"),
    store.get<unknown>("listPaneOpen"),
  ]);
  const parsed = settingsSchema.safeParse({
    libraryRoot: libraryRoot ?? defaultSettings.libraryRoot,
    folderPaneOpen: folderPaneOpen ?? defaultSettings.folderPaneOpen,
    listPaneOpen: listPaneOpen ?? defaultSettings.listPaneOpen,
  });
  return parsed.success ? parsed.data : defaultSettings;
}

export async function saveSettings(settings: LayoutSettings): Promise<void> {
  const parsed = settingsSchema.parse(settings);
  await Promise.all([
    store.set("libraryRoot", parsed.libraryRoot),
    store.set("folderPaneOpen", parsed.folderPaneOpen),
    store.set("listPaneOpen", parsed.listPaneOpen),
  ]);
  await store.save();
}
