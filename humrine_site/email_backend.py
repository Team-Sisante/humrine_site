import ssl
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend


class CustomEmailBackend(SMTPBackend):
    def open(self):
        if self.connection:
            return False
        
        connection_params = {'timeout': self.timeout}
        
        try:
            self.connection = self.connection_class(
                self.host, self.port, **connection_params
            )
            
            if self.use_tls:
                ssl_context = ssl.create_default_context(
                    cafile='/etc/ssl/certs/ca-certificates.crt'
                )
                self.connection.starttls(context=ssl_context)
            
            if self.username and self.password:
                self.connection.login(self.username, self.password)
            
            return True
        except Exception:
            if not self.fail_silently:
                raise