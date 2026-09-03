// reka/resolver.ts
import * as t from "@rekajs/types";
import type { ComponentType } from "react";
import ContainerComponent from "@/components/builder/Container";
import TextComponent from "@/components/builder/Text";
import HeadingComponent from "@/components/builder/Heading";
import CardComponent from "@/components/builder/Card";
import BadgeComponent from "@/components/builder/Badge";
import ButtonComponent from "@/components/builder/Button";

/**
 * Returns an array of t.ExternalComponent nodes for Reka.create().
 * Pass this to: Reka.create({ externals: { components: createExternals() } })
 */
export function createExternals(): t.ExternalComponent[] {
  return [
    t.externalComponent({
      name: "Container",
      render: ContainerComponent as ComponentType<any>,
    }),
    t.externalComponent({
      name: "Text",
      render: TextComponent as ComponentType<any>,
    }),
    t.externalComponent({
      name: "Heading",
      render: HeadingComponent as ComponentType<any>,
    }),
    t.externalComponent({
      name: "Card",
      render: CardComponent as ComponentType<any>,
    }),
    t.externalComponent({
      name: "Badge",
      render: BadgeComponent as ComponentType<any>,
    }),
    t.externalComponent({
      name: "Button",
      render: ButtonComponent as ComponentType<any>,
    }),
  ];
}