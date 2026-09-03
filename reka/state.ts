// reka/state.ts
import { Reka } from "@rekajs/core";
import * as t from "@rekajs/types";
import { createExternals } from "./resolver";

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

                  // Badge row
                  t.componentTemplate({
                    component: t.identifier({ name: "Container", external: true }),
                    props: {
                      className: t.literal({ value: "flex flex-row gap-2 flex-wrap" }),
                    },
                    slots: {
                      children: [
                        t.componentTemplate({
                          component: t.identifier({ name: "Badge", external: true }),
                          props: {
                            label:   t.literal({ value: "Friday Prayer" }),
                            variant: t.literal({ value: "solid" }),
                            color:   t.literal({ value: "emerald" }),
                            size:    t.literal({ value: "md" }),
                            shape:   t.literal({ value: "pill" }),
                          },
                          slots: {},
                        }),
                        t.componentTemplate({
                          component: t.identifier({ name: "Badge", external: true }),
                          props: {
                            label:   t.literal({ value: "Announcement" }),
                            variant: t.literal({ value: "soft" }),
                            color:   t.literal({ value: "amber" }),
                            size:    t.literal({ value: "md" }),
                            shape:   t.literal({ value: "pill" }),
                          },
                          slots: {},
                        }),
                      ],
                    },
                  }),

                  // Announcement card with button
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
                            className: t.literal({ value: "text-sm text-slate-600 mb-4" }),
                          },
                          slots: {},
                        }),
                        // Button row
                        t.componentTemplate({
                          component: t.identifier({ name: "Container", external: true }),
                          props: {
                            className: t.literal({ value: "flex flex-row gap-2" }),
                          },
                          slots: {
                            children: [
                              t.componentTemplate({
                                component: t.identifier({ name: "Button", external: true }),
                                props: {
                                  label:   t.literal({ value: "Read More" }),
                                  variant: t.literal({ value: "solid" }),
                                  color:   t.literal({ value: "emerald" }),
                                  size:    t.literal({ value: "md" }),
                                  shape:   t.literal({ value: "rounded" }),
                                },
                                slots: {},
                              }),
                              t.componentTemplate({
                                component: t.identifier({ name: "Button", external: true }),
                                props: {
                                  label:   t.literal({ value: "Dismiss" }),
                                  variant: t.literal({ value: "ghost" }),
                                  color:   t.literal({ value: "slate" }),
                                  size:    t.literal({ value: "md" }),
                                  shape:   t.literal({ value: "rounded" }),
                                },
                                slots: {},
                              }),
                            ],
                          },
                        }),
                      ],
                    },
                  }),

                  // Full-width CTA button
                  t.componentTemplate({
                    component: t.identifier({ name: "Button", external: true }),
                    props: {
                      label:     t.literal({ value: "View Full Prayer Schedule" }),
                      variant:   t.literal({ value: "soft" }),
                      color:     t.literal({ value: "emerald" }),
                      size:      t.literal({ value: "lg" }),
                      shape:     t.literal({ value: "pill" }),
                      fullWidth: t.literal({ value: true }),
                    },
                    slots: {},
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