import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"

export function ContactForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("contact_messages").insert({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        message: formData.message.trim(),
      })

      if (error) throw error

      toast.success("Message sent successfully!")
      setFormData({ full_name: "", email: "", phone: "", message: "" })
    } catch (error) {
      toast.error("Failed to send message. Please try again.")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-2xl mx-auto space-y-4 pointer-events-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-white">Full Name</Label>
          <Input
            id="name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="John Doe"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-white">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="john@company.com"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="phone" className="text-white">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          placeholder="+251 000 000 000"
        />
      </div>
      <div>
        <Label htmlFor="message" className="text-white">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          rows={5}
          className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          placeholder="Tell us about your project..."
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-white text-[oklch(0.26_0.072_263)] hover:bg-white/90 rounded-full"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  )
}
