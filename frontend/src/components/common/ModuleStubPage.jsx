import PageContainer from '../../layouts/PageContainer.jsx';

export function ModuleStubPage({ title, description }) {
  return (
    <PageContainer title={title} subtitle={description}>
      <p className="max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
        This page is an INVEXA scaffold. Replace this placeholder with the full module experience when you are ready to build the feature.
      </p>
    </PageContainer>
  );
}

export default ModuleStubPage;
