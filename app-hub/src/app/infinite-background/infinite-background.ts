import { Component } from '@angular/core';

@Component({
  selector: 'app-infinite-background',
  templateUrl: './infinite-background.html',
  styleUrls: ['./infinite-background.css']
})
export class InfiniteBackgroundComponent {
  particlesLayer1:any[] = [];
  particlesLayer2:any[] = [];
  particlesLayer3:any[] = [];

  ngOnInit(): void {
    this.particlesLayer1 = this.generateParticles(50);
    this.particlesLayer2 = this.generateParticles(30);
    this.particlesLayer3 = this.generateParticles(20);
  }

  private generateParticles(count: number):any[] {
    return Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * 20
    }));
  }
}
