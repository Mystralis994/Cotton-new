import { ArrowLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface PolicyPageProps {
  topic: 'delivery' | 'licensing' | 'refunds' | 'privacy';
}

export function PolicyPage({ topic }: PolicyPageProps) {
  const { navigate, t } = useStore();
  const doc = t.policies[topic];

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12 space-y-8">
      <button
        type="button"
        onClick={() => navigate({ page: 'home' })}
        className="inline-flex items-center gap-1.5 text-sm text-[#7E687F] hover:text-[#D93D7A] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>{t.common.backToStorefront}</span>
      </button>

      <article className="bg-white border border-[#EFE3E9] rounded-3xl p-7 sm:p-10 space-y-6">
        <header className="border-b border-[#F3E7ED] pb-5">
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-[#352336]">
            {doc.title}
          </h1>
          <p className="text-sm text-[#6D586E] mt-1.5">{doc.subtitle}</p>
        </header>

        <div className="space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-1.5">
              <h2 className="text-base font-semibold text-[#352336]">{section.heading}</h2>
              <p className="text-sm text-[#5D495E] leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
