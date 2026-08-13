import { LoginForm } from "~/components/login-form"

/**
 * The `LoginPage` component renders the login page of the application.
 * It includes a background image and centers the login form within the page.
 *
 * @returns A JSX element representing the login page.
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-light-sand/40 text-text-primary dark:bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <section className="relative hidden overflow-hidden bg-deep-sea px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between" aria-label="Pompeii authorization">
          <div aria-hidden="true" className="absolute -right-56 -top-72 h-[42rem] w-[42rem] rounded-full border border-white/[0.055]" />
          <div aria-hidden="true" className="absolute -right-28 -top-48 h-[30rem] w-[30rem] rounded-full border border-desert/20" />
          <div className="relative">
            <p className="text-sm font-semibold tracking-[0.09em]">POMPEII</p>
            <p className="app-secondary-copy mt-1 text-[11px] text-white/45">Authorization service</p>
          </div>
          <div className="relative max-w-xl border-t border-white/[0.09] pt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-desert">Governance & access</p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.12] tracking-refined">Authority should feel clear before it feels powerful.</h2>
            <p className="app-secondary-copy mt-5 max-w-lg text-sm leading-7 text-white/48">Roles, teams, permissions, and every administrative change held in one composed operational view.</p>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-md"><LoginForm /></div>
        </section>
      </div>
    </main>
  )
}
