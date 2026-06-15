import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

_driver = None


def fetch_page(url: str, timeout: int = 30) -> str:
    global _driver
    if _driver is None:
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-setuid-sandbox")
        _driver = uc.Chrome(options=options)

    _driver.get(url)
    WebDriverWait(_driver, timeout).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(3)
    html = _driver.page_source
    if len(html) < 5000:
        time.sleep(3)
        html = _driver.page_source
    return html


def close_browser():
    global _driver
    if _driver:
        try:
            _driver.quit()
        except Exception:
            pass
        _driver = None
