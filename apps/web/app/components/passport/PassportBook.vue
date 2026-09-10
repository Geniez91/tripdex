<script setup lang="ts">
import type { Country } from "~/types/tripdex";
import type { TripDexProfile } from "~/types/auth";
import TravelStamp from "~/components/journal/TravelStamp.vue";
const props = defineProps<{
  profile: TripDexProfile | null;
  countries: Country[];
  loading?: boolean;
  failed?: boolean;
}>();
defineEmits<{ retry: []; logout: [] }>();
const initials = computed<string | undefined>(() =>
  props.profile?.username.slice(0, 2).toUpperCase(),
);
const emptySlots = computed<number>(() => 4 - (props.countries.length % 4));
</script>

<template>
  <section class="passport-book" aria-label="Passeport TripDex">
    <section class="identity-leaf" aria-label="Identité du voyageur">
      <header class="identity-heading">
        <div class="passport-brand">
          <VIcon icon="mdi-compass-outline" size="28" aria-hidden="true" />
          TRIPDEX
        </div>
        <p class="passport-label">PASSEPORT<br />VOYAGEUR</p>
      </header>
      <div class="identity-details">
        <div class="identity-portrait" aria-hidden="true">
          <span v-if="initials">{{ initials }}</span
          ><VIcon v-else icon="mdi-account-outline" size="54" />
        </div>
        <dl v-if="profile" class="identity-fields">
          <dt>NOM D’UTILISATEUR</dt>
          <dd>
            <h2>@{{ profile.username }}</h2>
          </dd>
          <dt>EMAIL</dt>
          <dd class="identity-email">{{ profile.email }}</dd>
        </dl>
      </div>
      <span class="traveler-label">VOYAGEUR TRIPDEX</span>
      <div class="identity-compass" aria-hidden="true">
        <VIcon icon="mdi-earth" size="160" />
      </div>
      <p class="identity-note">
        Le monde pour horizon.<br />Tes souvenirs pour bagage.
      </p>
      <button class="passport-logout" type="button" @click="$emit('logout')">
        Se déconnecter
      </button>
    </section>
    <section
      class="collection-leaf"
      aria-labelledby="collection-title"
      :aria-busy="loading"
    >
      <header class="collection-heading">
        <h2 id="collection-title">Mes tampons</h2>
        <p>Chaque voyage laisse une trace.</p>
        <span
          v-if="!loading && !failed && countries.length"
          class="country-count"
          ><strong>{{ countries.length }}</strong>
          <span>{{
            countries.length === 1 ? "pays exploré" : "pays explorés"
          }}</span></span
        >
      </header>
      <div v-if="loading" class="collection-message" role="status">
        Ouverture de ton passeport…
      </div>
      <div v-else-if="failed" class="collection-message" role="alert">
        <p>Impossible de charger tes tampons.</p>
        <button class="text-button" type="button" @click="$emit('retry')">
          Réessayer
        </button>
      </div>
      <template v-else>
        <div v-if="!countries.length" class="passport-empty" role="status">
          <p>Ton passeport attend son premier voyage.</p>
          <VBtn to="/" color="primary" prepend-icon="mdi-book-plus-outline"
            >Ajouter au journal</VBtn
          >
        </div>
        <ul
          class="badge-grid"
          :class="{ 'collection-starting': countries.length < 2 }"
          aria-label="Collection de tampons"
        >
          <li
            v-for="country in countries"
            :key="country.id"
            class="badge-slot badge-earned"
          >
            <TravelStamp
              :destination="country.name"
              :country="country.iso2"
              :seed="country.iso2"
              collectible
            />
          </li>
          <li
            v-for="slot in emptySlots"
            :key="`empty-${slot}`"
            class="badge-slot"
            aria-hidden="true"
          >
            <div class="empty-stamp">
              <VIcon icon="mdi-airplane" size="22" /><span
                >PROCHAIN<br />VOYAGE</span
              ><span class="empty-dot">·</span>
            </div>
          </li>
        </ul>
        <p class="collection-note">Il reste de la place dans ton passeport.</p>
      </template>
    </section>
  </section>
</template>

<style scoped>
.passport-book {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
  padding: 16px 22px 22px;
  border: 1px solid #9b8962;
  border-radius: 26px;
  background: #182c40;
  box-shadow:
    inset 0 0 0 5px #20374b,
    inset 0 0 0 6px #b6a17855,
    0 22px 44px #152a3826,
    0 5px 0 #102132;
  isolation: isolate;
}
.passport-book::before,
.passport-book::after {
  content: "";
  position: absolute;
  inset: 8px;
  border: 2px solid #b9a27766;
  border-radius: 20px;
  pointer-events: none;
  z-index: -1;
  clip-path: polygon(
    0 0,
    36px 0,
    36px 5px,
    5px 5px,
    5px 36px,
    0 36px,
    0 0,
    100% 0,
    100% 36px,
    calc(100% - 5px) 36px,
    calc(100% - 5px) 5px,
    calc(100% - 36px) 5px,
    calc(100% - 36px) 0
  );
}
.passport-book::after {
  transform: rotate(180deg);
}
.identity-leaf,
.collection-leaf {
  min-width: 0;
  color: #33483e;
  background-color: #f7f2e5;
  background-image: repeating-linear-gradient(
    28deg,
    transparent 0 48px,
    #897c5a06 49px 50px,
    transparent 51px 83px
  );
}
.identity-leaf {
  display: flex;
  flex-direction: column;
  padding: 38px 32px 24px;
  border-radius: 12px 0 0 12px;
  border-right: 1px solid #8b806b77;
  box-shadow:
    inset -22px 0 26px -20px #51473199,
    inset 0 -4px 0 #d8d1bc;
}
.identity-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 28px;
  border-bottom: 1px solid #a69b7f66;
}
.passport-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 750;
  letter-spacing: 2px;
}
.passport-label {
  font-size: 9px;
  line-height: 1.7;
  letter-spacing: 2px;
}
.identity-details {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 34px 0;
}
.identity-portrait {
  flex: 0 0 102px;
  height: 132px;
  display: grid;
  place-items: center;
  border: 1px solid #b7bba4;
  border-radius: 6px;
  outline: 1px solid #b7bba466;
  outline-offset: 4px;
  background:
    repeating-linear-gradient(135deg, #7b8b6d09 0 1px, transparent 1px 6px),
    #e7e8da;
  font:
    34px Georgia,
    serif;
  color: #65775b;
}
.identity-fields {
  min-width: 0;
}
.identity-fields dt {
  font-size: 8px;
  letter-spacing: 1.6px;
  color: #6b725f;
  margin-bottom: 8px;
}
.identity-fields dt:not(:first-child) {
  margin-top: 24px;
}
.identity-fields dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.identity-fields h2 {
  font-size: 20px;
  font-weight: 550;
}
.identity-email {
  font-size: 12px;
  line-height: 1.6;
}
.traveler-label {
  border-block: 1px solid #a69b7f66;
  padding: 14px 0;
  font-size: 9px;
  letter-spacing: 3px;
}
.identity-compass {
  color: #667b6429;
  margin: 34px auto 18px;
  position: relative;
}
.identity-compass::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -34px;
  width: 228px;
  height: 36px;
  background: repeating-linear-gradient(
    0deg,
    transparent 0 8px,
    #667b6420 8px 9px
  );
  transform: rotate(-12deg);
}
.identity-note {
  text-align: center;
  font:
    italic 16px/1.7 Georgia,
    serif;
  color: #72765e;
}
.passport-logout {
  align-self: center;
  margin-top: auto;
  padding: 30px 10px 8px;
  font-size: 12px;
  color: #65705f;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.collection-leaf {
  padding: 36px 26px 24px 30px;
  border-radius: 0 12px 12px 0;
  box-shadow:
    inset 22px 0 26px -20px #51473188,
    inset 0 -4px 0 #d8d1bc;
}
.collection-heading {
  position: relative;
  padding: 0 100px 24px 0;
  border-bottom: 1px solid #a69b7f66;
}
.collection-heading h2 {
  margin-bottom: 10px;
  font:
    30px/1.2 Georgia,
    serif;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.collection-heading p {
  font-size: 12px;
  color: #6b725f;
}
.country-count {
  position: absolute;
  right: 0;
  top: 0;
  text-align: center;
  display: grid;
  gap: 4px;
}
.country-count strong {
  font:
    32px/1 Georgia,
    serif;
}
.country-count span {
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.badge-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px 12px;
  margin: 28px 0;
  padding: 0;
}
.badge-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.badge-slot :deep(.is-collectible) {
  width: 100%;
  max-width: 150px;
}
.badge-slot :deep(.is-collectible .stamp-ring) {
  width: 100%;
  min-height: 160px;
  padding: 18px 10px;
}
.badge-slot :deep(.stamp-ring strong) {
  font-size: 12px;
}
.empty-stamp {
  width: 100%;
  max-width: 150px;
  min-height: 160px;
  border: 1px dashed #acb39b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #858f77;
}
.empty-stamp span {
  font:
    8px/1.6 ui-monospace,
    monospace;
  text-align: center;
  letter-spacing: 1px;
}
.empty-stamp .empty-dot {
  font-size: 20px;
  line-height: 0.7;
}
.collection-note {
  text-align: center;
  font:
    italic 14px/1.5 Georgia,
    serif;
  color: #737b65;
  padding: 12px 0;
}
.passport-empty {
  margin-top: 24px;
  text-align: center;
}
.passport-empty p {
  font:
    18px/1.5 Georgia,
    serif;
  margin-bottom: 16px;
}
.collection-message {
  padding: 64px 0;
  text-align: center;
}
@media (min-width: 801px) and (max-width: 1199px) {
  .passport-book {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  }
  .identity-leaf {
    padding-inline: 22px;
  }
  .identity-details {
    flex-direction: column;
    align-items: start;
  }
  .identity-portrait {
    flex-basis: auto;
    width: 102px;
  }
  .badge-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 800px) {
  .passport-book {
    grid-template-columns: minmax(0, 1fr);
    padding: 12px 14px 16px;
    border-radius: 20px;
  }
  .identity-leaf {
    border-radius: 10px 10px 0 0;
    border-right: 0;
    border-bottom: 1px solid #a69b7f77;
    padding: 26px;
    box-shadow: inset 0 -14px 20px -20px #51473199;
  }
  .identity-compass {
    margin: 20px auto 10px;
  }
  .identity-compass :deep(.v-icon) {
    font-size: 90px !important;
    height: 90px !important;
    width: 90px !important;
  }
  .identity-note {
    font-size: 14px;
  }
  .collection-leaf {
    border-radius: 0 0 10px 10px;
    padding: 28px 24px;
    box-shadow:
      inset 0 14px 20px -20px #51473199,
      inset 0 -4px 0 #d8d1bc;
  }
  .badge-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .identity-leaf {
    padding: 24px 18px;
  }
  .passport-brand {
    font-size: 17px;
    letter-spacing: 1px;
    gap: 5px;
  }
  .passport-label {
    font-size: 8px;
    letter-spacing: 1px;
  }
  .identity-heading {
    gap: 8px;
    padding-bottom: 20px;
  }
  .identity-details {
    gap: 16px;
    padding: 28px 0;
  }
  .identity-portrait {
    flex-basis: 72px;
    height: 98px;
    font-size: 26px;
  }
  .identity-fields h2 {
    font-size: 16px;
  }
  .identity-fields dt {
    font-size: 7px;
    letter-spacing: 0.8px;
  }
  .identity-email {
    font-size: 11px;
  }
  .collection-leaf {
    padding: 28px 14px 20px;
  }
  .collection-heading {
    padding: 0 0 22px;
  }
  .collection-heading h2 {
    font-size: 25px;
  }
  .country-count {
    position: static;
    display: flex;
    align-items: baseline;
    justify-content: start;
    gap: 10px;
    margin-top: 18px;
  }
  .country-count strong {
    font-size: 26px;
  }
  .badge-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 10px;
  }
  .badge-slot :deep(.is-collectible .stamp-ring),
  .empty-stamp {
    min-height: 156px;
  }
}
</style>
