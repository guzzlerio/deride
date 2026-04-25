<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useData, withBase } from 'vitepress'

const route = useRoute()
const { site } = useData()

interface VersionEntry {
  label: string
  prefix: string
  link: string
}

const allVersions: VersionEntry[] = [
  { label: 'Latest release', prefix: '/latest/', link: '/latest/guide/introduction' },
  { label: 'Next (develop)', prefix: '/next/', link: '/next/guide/introduction' },
]

const versions = computed(() => {
  const hasNext = site.value.themeConfig.hasNextVersion !== false
  return hasNext ? allVersions : allVersions.filter((v) => v.prefix !== '/next/')
})

const currentVersion = computed(() => {
  const path = route.path
  const match = path.match(/^\/(next|latest|v\d+)\//)
  return match ? match[1] : 'latest'
})

const current = computed(() => {
  return versions.value.find((v) => v.prefix === `/${currentVersion.value}/`) ?? versions.value[0]
})

const open = ref(false)

function close() {
  open.value = false
}

/** Rewrite nav link prefixes to stay within the current version. */
function rewriteNavLinks() {
  const prefix = currentVersion.value
  const navLinks = document.querySelectorAll(
    '.VPNavBarMenu a.VPLink, .VPNavBarMenuGroup a.VPLink, .VPNavScreenMenu a.VPLink'
  )
  for (const el of navLinks) {
    const href = el.getAttribute('href')
    if (!href) continue
    const rewritten = href.replace(/\/(next|latest|v\d+)\//, `/${prefix}/`)
    if (rewritten !== href) {
      el.setAttribute('href', rewritten)
    }
  }
}

onMounted(() => {
  watch(() => route.path, () => requestAnimationFrame(rewriteNavLinks), { immediate: true })
})
</script>

<template>
  <div class="version-switcher" @mouseleave="close">
    <button class="version-button" @click="open = !open">
      {{ current.label }}
      <span class="arrow" :class="{ flipped: open }">▾</span>
    </button>
    <div v-if="open" class="version-menu">
      <a
        v-for="v in versions"
        :key="v.prefix"
        :href="withBase(v.link)"
        class="version-item"
        :class="{ active: v === current }"
        @click="close"
      >
        {{ v.label }}
      </a>
      <a
        href="https://github.com/guzzlerio/deride/blob/v1.3.0/README.md"
        class="version-item"
        target="_blank"
      >
        v1.x ↗
      </a>
    </div>
  </div>
</template>

<style scoped>
.version-switcher {
  position: relative;
  margin-left: 8px;
}

.version-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.version-button:hover {
  border-color: var(--vp-c-brand-1);
}

.arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.arrow.flipped {
  transform: rotate(180deg);
}

.version-menu {
  position: absolute;
  top: 100%;
  right: 0;
  padding-top: 4px;
  min-width: 160px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-2);
  z-index: 100;
}

.version-item {
  display: block;
  padding: 6px 12px;
  border-radius: 4px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
}

.version-item:hover {
  background: var(--vp-c-bg-soft);
}

.version-item.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
</style>
