import type { AnyPlugin, PluginCategory } from './plugin';

class PluginRegistry {
  private plugins = new Map<string, AnyPlugin>();
  private byCategory = new Map<PluginCategory, AnyPlugin[]>();

  register(plugin: AnyPlugin): void {
    this.plugins.set(plugin.id, plugin);
    const list = this.byCategory.get(plugin.category) ?? [];
    list.push(plugin);
    this.byCategory.set(plugin.category, list);
  }

  get<T extends AnyPlugin = AnyPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  getOrThrow<T extends AnyPlugin = AnyPlugin>(id: string): T {
    const plugin = this.plugins.get(id) as T | undefined;
    if (!plugin) throw new Error(`Plugin not found: ${id}`);
    return plugin;
  }

  getAll(category: PluginCategory): AnyPlugin[] {
    return this.byCategory.get(category) ?? [];
  }

  getFree(category: PluginCategory): AnyPlugin[] {
    return this.getAll(category).filter((p) => !p.premium);
  }

  getPremium(category: PluginCategory): AnyPlugin[] {
    return this.getAll(category).filter((p) => p.premium);
  }

  getAllIds(category: PluginCategory): string[] {
    return this.getAll(category).map((p) => p.id);
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  getAllPlugins(): AnyPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const registry = new PluginRegistry();
