// reka/state.ts
import { Reka } from "@rekajs/core";
import * as t from "@rekajs/types";
import { createExternals } from "@/reka/resolver";

export function createRekaState(): Reka {
  const reka = Reka.create({
    externals: {
      components: createExternals(),
    },
  });

  reka.load(
    t.state({
      program: t.program({
        components: [
          t.rekaComponent({
            name: "App",
            state: [],
            props: [],
            template: t.componentTemplate({
              component: t.identifier({ name: "Container", external: true }),
              props: {
                className: t.literal({ value: "p-8 flex flex-col gap-6" }),
              },
              slots: {
                children: [
                  // Page title
                  t.componentTemplate({
                    component: t.identifier({ name: "Heading", external: true }),
                    props: {
                      text:   t.literal({ value: "Welcome to Our Masjid" }),
                      level:  t.literal({ value: 1 }),
                      preset: t.literal({ value: "bold" }),
                      color:  t.literal({ value: "emerald" }),
                    },
                    slots: {},
                  }),

                  // Prayer schedule card
                  t.componentTemplate({
                    component: t.identifier({ name: "Card", external: true }),
                    props: {
                      title:   t.literal({ value: "Today's Prayer Schedule" }),
                      variant: t.literal({ value: "filled" }),
                      color:   t.literal({ value: "emerald" }),
                      shadow:  t.literal({ value: "md" }),
                      padding: t.literal({ value: "md" }),
                    },
                    slots: {
                      children: [
                        t.componentTemplate({
                          component: t.identifier({ name: "Text", external: true }),
                          props: {
                            value:     t.literal({ value: "Fajr · 05:10 — Dhuhr · 12:20 — Asr · 15:40 — Maghrib · 18:05 — Isha · 19:20" }),
                            className: t.literal({ value: "text-sm text-emerald-800" }),
                          },
                          slots: {},
                        }),
                      ],
                    },
                  }),

                  // Announcement card
                  t.componentTemplate({
                    component: t.identifier({ name: "Card", external: true }),
                    props: {
                      title:   t.literal({ value: "Announcement" }),
                      variant: t.literal({ value: "outline" }),
                      shadow:  t.literal({ value: "sm" }),
                      padding: t.literal({ value: "md" }),
                    },
                    slots: {
                      children: [
                        t.componentTemplate({
                          component: t.identifier({ name: "Text", external: true }),
                          props: {
                            value:     t.literal({ value: "Friday prayer will begin at 12:30. Please arrive early." }),
                            className: t.literal({ value: "text-sm text-slate-600" }),
                          },
                          slots: {},
                        }),
                      ],
                    },
                  }),
                ],
              },
            }),
          }),
        ],
      }),
    })
  );

  return reka;
}
