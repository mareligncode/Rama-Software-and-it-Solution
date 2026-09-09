import { Nav } from '../components/site/Nav';
import { Footer } from '../components/site/Sections3';

function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="section-pad">
        <div className="container-x max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="mt-12 space-y-8">
            <section>
              <h2 className="font-display text-2xl font-bold">1. Acceptance of Terms</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                By accessing or using Rama Software & IT Solutions services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">2. Services</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Rama Software & IT Solutions provides enterprise software development, network infrastructure, cybersecurity, and IT consulting services. We reserve the right to modify, suspend, or discontinue any service at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">3. User Responsibilities</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">4. Intellectual Property</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                All content, features, and functionality of our services are owned by Rama Software & IT Solutions and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, or distribute our content without explicit permission.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">5. Payment Terms</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                For paid services, you agree to pay all fees in accordance with our pricing and payment terms. We reserve the right to change our fees at any time with prior notice. Failure to pay may result in service suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">6. Limitation of Liability</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                To the fullest extent permitted by law, Rama Software & IT Solutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, data loss, or business interruption.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">7. Termination</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We reserve the right to terminate or suspend your access to our services at any time, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">8. Governing Law</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                These Terms of Service shall be governed by and construed in accordance with the laws of Ethiopia, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">9. Changes to Terms</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We may update these Terms of Service from time to time. We will notify you of any changes by posting the new terms on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold">10. Contact Information</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Email:</strong> info@ramasoftware.com</p>
                <p><strong>Address:</strong> Bole Road, Addis Ababa, Ethiopia</p>
                <p><strong>Phone:</strong> +251 000 000 000</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default TermsOfService;