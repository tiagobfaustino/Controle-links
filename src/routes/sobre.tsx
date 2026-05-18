import { Mail, MessageCircle, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const whatsappUrl =
  "https://wa.me/5531996680419?text=Ol%C3%A1%2C%20AL%20SGT%20Faustino.%20Gostaria%20de%20falar%20sobre%20o%20Controle%20de%20Links.";

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-md border border-primary/40 bg-white shadow-sm">
        <div className="flex flex-col items-center border-b border-primary/20 px-6 py-10 text-center">
          <img
            src="/android-chrome-192x192.png"
            alt="Controle de Links"
            className="size-24 rounded-lg border border-primary/30 object-cover shadow-sm"
          />
          <p className="tactical-heading mt-5">CEFS 2026 - T. P</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-foreground">
            Controle de Links
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
            Sistema interno para acompanhamento de demandas, formulários e
            confirmações de cumprimento.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
              Criado por
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-[0.05em] text-foreground">
              AL SGT Faustino
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Turma P - CEFS 2026
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:tiagobfaustino@gmail.com">
                <Mail className="size-4" />
                Email
              </a>
            </Button>
          </div>
        </div>

        <div className="grid gap-0 border-t border-primary/20 md:grid-cols-3">
          <InfoItem label="Email" value="tiagobfaustino@gmail.com" />
          <InfoItem label="WhatsApp" value="(31) 99668-0419" />
          <div className="flex items-start gap-3 px-6 py-4">
            <MonitorSmartphone className="mt-0.5 size-4 text-accent" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">
                Instalação
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                Compatível com PWA
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-primary/10 px-6 py-4 md:border-b-0 md:border-r">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
